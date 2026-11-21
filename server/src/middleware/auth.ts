import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { resolveJwtSecret } from "@zebra/core/server";
import db from "../db/database";

export const JWT_SECRET = resolveJwtSecret(
  process.env.JWT_SECRET,
  process.env.NODE_ENV,
);
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SLIDING_RENEW_THRESHOLD_SEC = 6 * 24 * 60 * 60; // Renew when < 6 days remaining

interface AdminJwtPayload {
  role?: string;
  ver?: number;
  exp?: number;
}

/** Retrieve current admin token version so password change/logout can revoke old tokens. */
export function getAdminTokenVersion(): number {
  try {
    const row = db
      .prepare("SELECT value FROM system_settings WHERE key = 'token_version'")
      .get() as { value: string } | undefined;
    const parsed = row ? Number.parseInt(row.value, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

/** Increment token_version in DB to immediately invalidate previously issued JWTs. */
export function bumpAdminTokenVersion(): number {
  const next = getAdminTokenVersion() + 1;
  db.prepare(
    `INSERT INTO system_settings (key, value) VALUES ('token_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(String(next));
  return next;
}

/** Sign and attach a fresh HttpOnly admin JWT cookie. */
export function issueAdminCookie(
  res: Response,
  version = getAdminTokenVersion(),
): string {
  const token = jwt.sign({ role: "admin", ver: version }, JWT_SECRET, {
    expiresIn: "7d",
  });
  if (typeof res.cookie === "function") {
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE_MS,
    });
  }
  return token;
}

/** Check whether an incoming request carries a valid admin token without writing a response. */
export function isAdminRequest(req: Request): boolean {
  let token: string | undefined = req.cookies?.admin_token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (decoded.role !== "admin") return false;
    const currentVer = getAdminTokenVersion();
    if (decoded.ver !== undefined && decoded.ver !== currentVer) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Middleware to protect admin routes.
 * Verifies role claim, token version, and slides the cookie when nearing refresh window.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Use optional chaining in case cookie-parser is absent in unit tests
  let token: string | undefined = req.cookies?.admin_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (decoded.role !== "admin") {
      return res.status(401).json({ error: "Invalid token role" });
    }

    const currentVer = getAdminTokenVersion();
    if (decoded.ver !== undefined && decoded.ver !== currentVer) {
      return res.status(401).json({ error: "Session has been revoked" });
    }

    // Slide the HttpOnly cookie only when remaining lifetime drops below threshold
    if (req.cookies?.admin_token && typeof res.cookie === "function") {
      const nowSec = Math.floor(Date.now() / 1000);
      const remainingSec = (decoded.exp ?? 0) - nowSec;
      if (remainingSec < SLIDING_RENEW_THRESHOLD_SEC) {
        issueAdminCookie(res, currentVer);
      }
    }

    next();
  } catch (err) {
    console.warn(
      "Invalid token attempt:",
      err instanceof Error ? err.message : "unknown",
    );
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
