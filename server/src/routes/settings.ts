import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/database";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_big_stone_secret_key_change_me";

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
  db.get("SELECT value FROM system_settings WHERE key = 'admin_password'", (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ isSetup: !!row });
  });
});

// 2. Initial Setup (Set Password)
router.post("/setup", async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required" });

  db.get("SELECT value FROM system_settings WHERE key = 'admin_password'", async (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: "Admin already set up" });

    try {
      const hash = await bcrypt.hash(password, 10);
      db.run("INSERT INTO system_settings (key, value) VALUES ('admin_password', ?)", [hash], (errInsert) => {
        if (errInsert) return res.status(500).json({ error: errInsert.message });
        
        // Also set default language
        db.run("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('language', 'ko')");
        
        res.json({ message: "Admin setup successful" });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
});

// 3. Login
router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body;

  db.get("SELECT value FROM system_settings WHERE key = 'admin_password'", async (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(400).json({ error: "Admin not set up yet" });

    try {
      const match = await bcrypt.compare(password, row.value);
      if (!match) return res.status(401).json({ error: "Incorrect password" });

      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ token });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
});

// 4. Get general settings (publicly accessible for UI rendering like language)
router.get("/config", (req: Request, res: Response) => {
  db.all("SELECT key, value FROM system_settings WHERE key != 'admin_password'", (err, rows: any[]) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = rows.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    
    // Default language if not set
    if (!config.language) config.language = 'ko';
    
    res.json(config);
  });
});

// 5. Update settings (Admin only)
router.put("/config", requireAdmin, (req: Request, res: Response) => {
  const updates = req.body; // e.g. { language: 'en' }
  
  if (Object.keys(updates).length === 0) return res.json({ message: "No updates provided" });

  const stmt = db.prepare(`
    INSERT INTO system_settings (key, value) VALUES (?, ?) 
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  try {
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'admin_password') { // Prevent overriding password via config route
        stmt.run(key, String(value));
      }
    }
    stmt.finalize();
    res.json({ message: "Settings updated successfully" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;