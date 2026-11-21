import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v7 as uuidv7 } from "uuid";
import db from "../db/database";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// Require admin auth across all attachment endpoints including downloads
router.use(requireAdmin);

const uploadDir = path.resolve(__dirname, "../../data/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const SAFE_EXT_REGEX = /^\.[a-zA-Z0-9]{1,10}$/;

function resolveSafeUploadPath(filename: string): string | null {
  const safeName = path.basename(filename);
  const resolved = path.resolve(uploadDir, safeName);
  if (!resolved.startsWith(uploadDir + path.sep)) {
    return null;
  }
  return resolved;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    // Sanitize file extension to prevent path or double-extension issues
    const safeExt = SAFE_EXT_REGEX.test(rawExt) ? rawExt : "";
    cb(null, uuidv7() + safeExt);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Upload attachment
router.post(
  "/:groupId",
  upload.single("file"),
  (req: Request, res: Response) => {
    const { groupId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Decode UTF-8 original filename (multer defaults to Latin-1 header decoding, corrupting Korean names)
    const decodedOriginalName = Buffer.from(
      file.originalname,
      "latin1",
    ).toString("utf8");
    const attachmentId = uuidv7();
    const createdAt = new Date().toISOString();

    try {
      const groupExists = db
        .prepare("SELECT id FROM todo_groups WHERE id = ?")
        .get(groupId);
      if (!groupExists) {
        try {
          fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
        return res.status(404).json({ error: "Todo group not found" });
      }

      db.prepare(
        `INSERT INTO todo_attachments (id, groupId, originalName, filename, size, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        attachmentId,
        groupId,
        decodedOriginalName,
        file.filename,
        file.size,
        createdAt,
      );

      res.status(201).json({
        id: attachmentId,
        groupId,
        originalName: decodedOriginalName,
        filename: file.filename,
        size: file.size,
        createdAt,
      });
    } catch {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore cleanup errors */
      }
      res.status(500).json({ error: "Failed to save attachment" });
    }
  },
);

// Download attachment with original filename (authenticated)
router.get("/:id/download", (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const row = db
      .prepare(
        "SELECT filename, originalName FROM todo_attachments WHERE id = ?",
      )
      .get(id) as { filename: string; originalName: string } | undefined;
    if (!row) return res.status(404).json({ error: "Attachment not found" });

    const filePath = resolveSafeUploadPath(row.filename);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.download(filePath, row.originalName, (downloadErr) => {
      if (downloadErr) {
        console.error("Error downloading file:", downloadErr);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    });
  } catch {
    res.status(500).json({ error: "Failed to download attachment" });
  }
});

// Delete attachment
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const row = db
      .prepare("SELECT filename FROM todo_attachments WHERE id = ?")
      .get(id) as { filename: string } | undefined;
    if (!row) return res.status(404).json({ error: "Attachment not found" });

    db.prepare("DELETE FROM todo_attachments WHERE id = ?").run(id);

    const filePath = resolveSafeUploadPath(row.filename);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore cleanup errors */
      }
    }

    res.json({ message: "Attachment deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

export default router;
