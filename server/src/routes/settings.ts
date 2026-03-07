import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import db from "../db/database";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// Use the same secret logic as the middleware
const JWT_SECRET = process.env.JWT_SECRET || "dev_only_secret";
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set. Using fallback secret.");
}

// Strict rate limit for auth endpoints to prevent brute-force (per-IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

// Account-level lockout after consecutive failed attempts (IP-independent)
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getLoginFailureState(): { count: number; lockedUntil: number } {
  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'login_failure_state'")
      .get() as any;
    if (row) return JSON.parse(row.value);
  } catch { /* ignore parse errors */ }
  return { count: 0, lockedUntil: 0 };
}

function setLoginFailureState(count: number, lockedUntil: number): void {
  const value = JSON.stringify({ count, lockedUntil });
  db.prepare(
    `INSERT INTO system_settings (key, value) VALUES ('login_failure_state', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(value);
}

function resetLoginFailureState(): void {
  setLoginFailureState(0, 0);
}

function recordLoginFailure(): { locked: boolean; remainingMs: number } {
  const state = getLoginFailureState();
  const newCount = state.count + 1;

  if (newCount >= LOGIN_MAX_FAILURES) {
    const lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    setLoginFailureState(newCount, lockedUntil);
    return { locked: true, remainingMs: LOGIN_LOCKOUT_MS };
  }

  setLoginFailureState(newCount, 0);
  return { locked: false, remainingMs: 0 };
}

function checkAccountLocked(): { locked: boolean; remainingMs: number } {
  const state = getLoginFailureState();
  if (state.lockedUntil > 0) {
    const remaining = state.lockedUntil - Date.now();
    if (remaining > 0) {
      return { locked: true, remainingMs: remaining };
    }
    // Lockout expired, reset state
    resetLoginFailureState();
  }
  return { locked: false, remainingMs: 0 };
}

// 1. Check if admin is set up
router.get("/status", (req: Request, res: Response) => {
  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'admin_password'")
      .get() as any;
    res.json({ isSetup: !!row });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Initial Setup (Set Password)
router.post("/setup", authLimiter, async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required" });

  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'admin_password'")
      .get() as any;
    if (row) return res.status(400).json({ error: "Admin already set up" });

    const hash = await bcrypt.hash(password, 10);
    db.prepare(
      "INSERT INTO system_settings (key, value) VALUES ('admin_password', ?)",
    ).run(hash);

    // Also set default language
    db.prepare(
      "INSERT OR IGNORE INTO system_settings (key, value) VALUES ('language', 'ko')",
    ).run();

    res.json({ message: "Admin setup successful" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Login
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  const { password } = req.body;

  try {
    // Check account-level lockout before processing
    const lockStatus = checkAccountLocked();
    if (lockStatus.locked) {
      const remainingMin = Math.ceil(lockStatus.remainingMs / 60000);
      return res.status(429).json({
        error: `Account locked due to too many failed attempts. Try again in ${remainingMin} minute(s).`,
      });
    }

    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'admin_password'")
      .get() as any;
    if (!row) return res.status(400).json({ error: "Admin not set up yet" });

    const match = await bcrypt.compare(password, row.value);
    if (!match) {
      const failState = getLoginFailureState();
      const result = recordLoginFailure();
      if (result.locked) {
        const remainingMin = Math.ceil(result.remainingMs / 60000);
        return res.status(429).json({
          error: `Account locked after ${LOGIN_MAX_FAILURES} failed attempts. Try again in ${remainingMin} minute(s).`,
        });
      }
      const attemptsLeft = LOGIN_MAX_FAILURES - (failState.count + 1);
      return res.status(401).json({
        error: `Incorrect password. ${attemptsLeft} attempt(s) remaining before lockout.`,
      });
    }

    // Successful login: reset failure counter
    resetLoginFailureState();
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Refresh token (extends session for active users)
router.post("/refresh", requireAdmin, (req: Request, res: Response) => {
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// Internal keys that should not be exposed to the client
const INTERNAL_KEYS = ["admin_password", "login_failure_state"];

// 5. Get general settings (publicly accessible for UI rendering like language)
router.get("/config", (req: Request, res: Response) => {
  try {
    const placeholders = INTERNAL_KEYS.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT key, value FROM system_settings WHERE key NOT IN (${placeholders})`,
      )
      .all(...INTERNAL_KEYS) as any[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    // Default language if not set
    if (!config.language) config.language = "ko";

    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update settings (Admin only)
router.put("/config", requireAdmin, (req: Request, res: Response) => {
  const updates = req.body; // e.g. { language: 'en' }

  if (Object.keys(updates).length === 0)
    return res.json({ message: "No updates provided" });

  try {
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const upsertMany = db.transaction((entries: [string, unknown][]) => {
      for (const [key, value] of entries) {
        if (key !== "admin_password") {
          // Prevent overriding password via config route
          stmt.run(key, String(value));
        }
      }
    });
    upsertMany(Object.entries(updates));

    res.json({ message: "Settings updated successfully" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
