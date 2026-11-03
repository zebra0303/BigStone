import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_only_secret";

/**
 * Middleware to protect admin routes.
 * Checks for a valid JWT in the Authorization header.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token = req.cookies.admin_token;

  // Fallback to Authorization header for API clients or legacy support
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
    // Verify token
    jwt.verify(token, JWT_SECRET);

    // Automatically slide and renew the HttpOnly cookie on authenticated cookie requests
    if (req.cookies?.admin_token && typeof res.cookie === "function") {
      const renewedToken = jwt.sign({ role: "admin" }, JWT_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("admin_token", renewedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
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
