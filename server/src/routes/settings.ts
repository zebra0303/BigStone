import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import db from "../db/database";
import {
  bumpAdminTokenVersion,
  isAdminRequest,
  issueAdminCookie,
  requireAdmin,
} from "../middleware/auth";

const router = Router();

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

// Explicit allowlists prevent leaking secrets or writing arbitrary internal DB keys
const PUBLIC_CONFIG_KEYS = new Set([
  "language",
  "timezone",
  "theme",
  "primary_color",
  "font_family",
]);
const ALLOWED_CONFIG_KEYS = new Set([
  ...PUBLIC_CONFIG_KEYS,
  "slack_webhook_url",
]);
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isValidSlackWebhookUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "hooks.slack.com" &&
      parsed.pathname.startsWith("/services/")
    );
  } catch {
    return false;
  }
}

function getLoginFailureState(): { count: number; lockedUntil: number } {
  try {
    const row = db
      .prepare(
        "SELECT value FROM system_settings WHERE key = 'login_failure_state'",
      )
      .get() as { value: string } | undefined;
    if (row) return JSON.parse(row.value);
  } catch {
    /* ignore parse errors */
  }
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

// Atomic read-modify-write prevents concurrent login failures from bypassing lockout
const recordLoginFailureTx = db.transaction(
  (): {
    locked: boolean;
    remainingMs: number;
    count: number;
  } => {
    const state = getLoginFailureState();
    const newCount = state.count + 1;

    if (newCount >= LOGIN_MAX_FAILURES) {
      const lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
      setLoginFailureState(newCount, lockedUntil);
      return { locked: true, remainingMs: LOGIN_LOCKOUT_MS, count: newCount };
    }

    setLoginFailureState(newCount, 0);
    return { locked: false, remainingMs: 0, count: newCount };
  },
);

function checkAccountLocked(): { locked: boolean; remainingMs: number } {
  const state = getLoginFailureState();
  if (state.lockedUntil > 0) {
    const remaining = state.lockedUntil - Date.now();
    if (remaining > 0) {
      return { locked: true, remainingMs: remaining };
    }
    resetLoginFailureState();
  }
  return { locked: false, remainingMs: 0 };
}

// 1. Check if admin is set up
router.get("/status", (_req: Request, res: Response) => {
  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'admin_password'")
      .get() as { value: string } | undefined;
    res.json({ isSetup: !!row });
  } catch {
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

// 2. Initial Setup (Set Password)
router.post("/setup", authLimiter, async (req: Request, res: Response) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password.length < 4) {
    return res
      .status(400)
      .json({ error: "Password must be at least 4 characters" });
  }

  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'admin_password'")
      .get() as { value: string } | undefined;
    if (row) return res.status(400).json({ error: "Admin already set up" });

    const hash = await bcrypt.hash(password, 10);
    db.prepare(
      "INSERT INTO system_settings (key, value) VALUES ('admin_password', ?)",
    ).run(hash);

    db.prepare(
      "INSERT OR IGNORE INTO system_settings (key, value) VALUES ('language', 'ko')",
    ).run();

    res.json({ message: "Admin setup successful" });
  } catch {
    res.status(500).json({ error: "Failed to complete admin setup" });
  }
});

// 3. Login
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const lockStatus = checkAccountLocked();
    if (lockStatus.locked) {
      const remainingMin = Math.ceil(lockStatus.remainingMs / 60000);
      return res.status(429).json({
        error: `Account locked due to too many failed attempts. Try again in ${remainingMin} minute(s).`,
      });
    }

    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'admin_password'")
      .get() as { value: string } | undefined;
    if (!row) return res.status(400).json({ error: "Admin not set up yet" });

    const match = await bcrypt.compare(password, row.value);
    if (!match) {
      const result = recordLoginFailureTx();
      if (result.locked) {
        const remainingMin = Math.ceil(result.remainingMs / 60000);
        return res.status(429).json({
          error: `Account locked after ${LOGIN_MAX_FAILURES} failed attempts. Try again in ${remainingMin} minute(s).`,
        });
      }
      const attemptsLeft = Math.max(0, LOGIN_MAX_FAILURES - result.count);
      return res.status(401).json({
        error: `Incorrect password. ${attemptsLeft} attempt(s) remaining before lockout.`,
      });
    }

    resetLoginFailureState();
    issueAdminCookie(res);
    res.json({ message: "Login successful" });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// 4. Refresh token (extends session for active users)
router.post("/refresh", requireAdmin, (_req: Request, res: Response) => {
  issueAdminCookie(res);
  res.json({ message: "Token refreshed" });
});

// 4-1. Logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("admin_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Logged out successfully" });
});

// 4-2. Change password (Admin only)
router.put(
  "/password",
  requireAdmin,
  authLimiter,
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }
    if (newPassword.length < 4) {
      return res
        .status(400)
        .json({ error: "New password must be at least 4 characters" });
    }

    try {
      const row = db
        .prepare(
          "SELECT value FROM system_settings WHERE key = 'admin_password'",
        )
        .get() as { value: string } | undefined;
      if (!row) return res.status(400).json({ error: "Admin not set up yet" });

      const match = await bcrypt.compare(currentPassword, row.value);
      if (!match) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      db.prepare(
        "UPDATE system_settings SET value = ? WHERE key = 'admin_password'",
      ).run(hash);

      // Revoke all previously issued tokens and issue a fresh cookie with the new version
      const newVersion = bumpAdminTokenVersion();
      issueAdminCookie(res, newVersion);
      res.json({ message: "Password changed successfully" });
    } catch {
      res.status(500).json({ error: "Failed to change password" });
    }
  },
);

// 5. Get general settings (only safe UI keys are public; secrets require admin auth)
router.get("/config", (req: Request, res: Response) => {
  try {
    const isAdmin = isAdminRequest(req);
    const allowedKeys = isAdmin ? ALLOWED_CONFIG_KEYS : PUBLIC_CONFIG_KEYS;
    const rows = db.prepare("SELECT key, value FROM system_settings").all() as {
      key: string;
      value: string;
    }[];

    const config: Record<string, string> = {};
    for (const row of rows) {
      if (allowedKeys.has(row.key)) {
        config[row.key] = row.value;
      }
    }

    if (!config.language) config.language = "ko";

    res.json(config);
  } catch {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// 6. Update settings (Admin only, strict key and value validation)
router.put("/config", requireAdmin, (req: Request, res: Response) => {
  const updates = req.body;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return res.status(400).json({ error: "Invalid settings payload" });
  }

  const entries = Object.entries(updates as Record<string, unknown>).filter(
    ([key]) => ALLOWED_CONFIG_KEYS.has(key),
  );
  if (entries.length === 0) {
    return res.json({ message: "No updates provided" });
  }

  // Validate sensitive & security-relevant fields before saving
  for (const [key, rawValue] of entries) {
    const value = String(rawValue ?? "").trim();
    if (key === "slack_webhook_url" && !isValidSlackWebhookUrl(value)) {
      return res.status(400).json({
        error:
          "Slack webhook URL must start with https://hooks.slack.com/services/",
      });
    }
    if (key === "primary_color" && value && !HEX_COLOR_REGEX.test(value)) {
      return res.status(400).json({ error: "Invalid primary color format" });
    }
    if (key === "theme" && value && value !== "light" && value !== "dark") {
      return res.status(400).json({ error: "Invalid theme value" });
    }
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO system_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const upsertMany = db.transaction((items: [string, unknown][]) => {
      for (const [key, value] of items) {
        stmt.run(key, String(value ?? "").trim());
      }
    });
    upsertMany(entries);

    res.json({ message: "Settings updated successfully" });
  } catch {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
