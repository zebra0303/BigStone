import path from "path";
import * as dotenv from "dotenv";
// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { AppError } from "@zebra/core/server";
import { createCorsDelegate } from "./middleware/cors";
import db from "./db/database";
import todosRouter from "./routes/todos";
import settingsRouter from "./routes/settings";
import attachmentsRouter from "./routes/attachments";
import retrospectivesRouter from "./routes/retrospectives";
import { startNotificationService } from "./services/notificationService";

const app = express();
const PORT = process.env.PORT || 3001;

// Start background services and retain handle for graceful shutdown
const notificationTask = startNotificationService();

// Security headers
app.use(helmet());

// Parse cookies
app.use(cookieParser());

// CORS: allow same-origin requests automatically behind reverse proxies, restrict cross-origin to allowlist
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [`http://localhost:${process.env.VITE_PORT || 5173}`];

app.use(cors(createCorsDelegate(allowedOrigins)));

// Body size limit
app.use(express.json({ limit: "1mb" }));

// Global rate limit: 100 requests per minute per IP
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  }),
);

// Mount more specific attachment route before /api/todos (unauthenticated /uploads removed)
app.use("/api/todos/attachments", attachmentsRouter);
app.use("/api/todos", todosRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/retrospectives", retrospectivesRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Centralized error handler prevents leaking stack traces or raw DB/multer errors
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(413).json({ error: "File size exceeds 10MB limit" });
  }
  console.error("[Server Error]", err);
  return res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown stops cron scheduler and checkpoints/closes SQLite WAL safely
function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down BigStone server...`);
  notificationTask.stop();
  server.close(() => {
    try {
      db.close();
    } catch {
      /* ignore close errors */
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
