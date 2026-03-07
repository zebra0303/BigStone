import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/database";

const router = Router();
const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_big_stone_secret_key_change_me";

// Middleware to protect admin routes
export const requireAdmin = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

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
router.post("/setup", async (req: Request, res: Response) => {
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
router.post("/login", async (req: Request, res: Response) => {
  const { password } = req.body;

  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'admin_password'")
      .get() as any;
    if (!row) return res.status(400).json({ error: "Admin not set up yet" });

    const match = await bcrypt.compare(password, row.value);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Get general settings (publicly accessible for UI rendering like language)
router.get("/config", (req: Request, res: Response) => {
  try {
    const rows = db
      .prepare(
        "SELECT key, value FROM system_settings WHERE key != 'admin_password'",
      )
      .all() as any[];

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
