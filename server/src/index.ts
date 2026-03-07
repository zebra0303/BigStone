import path from "path";
import * as dotenv from "dotenv";
// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import todosRouter from "./routes/todos";
import settingsRouter from "./routes/settings";
import attachmentsRouter from "./routes/attachments";
import { startNotificationService } from "./services/notificationService";

const app = express();
const PORT = process.env.PORT || 3001;

// Start background services
startNotificationService();

// Security headers
app.use(helmet());

// CORS: restrict to known origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [`http://localhost:${process.env.VITE_PORT || 5173}`];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes("*") || allowedOrigins.includes(origin);

      if (isAllowed) {
        callback(null, true);
      } else {
        // Log the rejected origin for debugging instead of throwing an unhandled exception
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

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

// Serve uploaded files statically with download-only headers
app.use(
  "/uploads",
  (req, res, next) => {
    // Force download to prevent Stored XSS via uploaded HTML/SVG
    res.setHeader("Content-Disposition", "attachment");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  },
  express.static(path.resolve(__dirname, "../../server/data/uploads")),
);

app.use("/api/todos", todosRouter);
app.use("/api/todos/attachments", attachmentsRouter);
app.use("/api/settings", settingsRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve client static files in production (single-port deployment)
const clientDistPath = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// SPA fallback: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
