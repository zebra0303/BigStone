import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v7 as uuidv7 } from "uuid";
import db from "../db/database";

const router = Router();

// Configure multer storage
const uploadDir = path.resolve(__dirname, "../../data/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv7();
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

    const attachmentId = uuidv7();
    const createdAt = new Date().toISOString();

    const sql = `
    INSERT INTO todo_attachments (id, groupId, originalName, filename, size, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

    try {
      db.prepare(sql).run(
        attachmentId,
        groupId,
        file.originalname,
        file.filename,
        file.size,
        createdAt,
      );

      res.status(201).json({
        id: attachmentId,
        groupId,
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        createdAt,
      });
    } catch (err: any) {
      // Clean up file if DB insert fails
      fs.unlinkSync(file.path);
      res.status(500).json({ error: err.message });
    }
  },
);

// Download attachment with original filename
router.get("/:id/download", (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const row = db
      .prepare(
        "SELECT filename, originalName FROM todo_attachments WHERE id = ?",
      )
      .get(id) as any;
    if (!row) return res.status(404).json({ error: "Attachment not found" });

    const filePath = path.join(uploadDir, row.filename);

    if (fs.existsSync(filePath)) {
      res.download(filePath, row.originalName, (downloadErr) => {
        if (downloadErr) {
          console.error("Error downloading file:", downloadErr);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error downloading file" });
          }
        }
      });
    } else {
      res.status(404).json({ error: "File not found on disk" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete attachment
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const row = db
      .prepare("SELECT filename FROM todo_attachments WHERE id = ?")
      .get(id) as any;
    if (!row) return res.status(404).json({ error: "Attachment not found" });

    const filePath = path.join(uploadDir, row.filename);

    db.prepare("DELETE FROM todo_attachments WHERE id = ?").run(id);

    // Remove file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Attachment deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
