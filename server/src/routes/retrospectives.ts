import { Router, Request, Response } from "express";
import db from "../db/database";
import { v7 as uuidv7 } from "uuid";
import { requireAdmin } from "../middleware/auth";

const router = Router();
const DATE_STR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Protect all retrospective endpoints including private GET/summary routes
router.use(requireAdmin);

// Get all retrospectives (newest first)
router.get("/", (_req: Request, res: Response) => {
  try {
    const rows = db
      .prepare("SELECT * FROM retrospectives ORDER BY periodEnd DESC")
      .all();
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch retrospectives" });
  }
});

// Register static /summary/tasks BEFORE parameterized /:id route
router.get("/summary/tasks", (req: Request, res: Response) => {
  const { start, end } = req.query;
  if (
    typeof start !== "string" ||
    typeof end !== "string" ||
    !DATE_STR_REGEX.test(start) ||
    !DATE_STR_REGEX.test(end)
  ) {
    return res.status(400).json({
      error: "Valid start and end (YYYY-MM-DD) query params required",
    });
  }

  try {
    const tasks = db
      .prepare(
        `SELECT t.id, t.dueDate, t.status, t.completedAt,
                g.title, g.priority, g.isImportant, g.isPinned, g.isCopied
         FROM todos t
         JOIN todo_groups g ON t.groupId = g.id
         WHERE (t.dueDate >= ? AND t.dueDate <= ?)
            OR (g.isPinned = 1 AND t.completedAt IS NOT NULL
                AND SUBSTR(t.completedAt, 1, 10) >= ? AND SUBSTR(t.completedAt, 1, 10) <= ?)
         ORDER BY t.dueDate ASC`,
      )
      .all(start, end, start, end) as any[];

    const summary = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "DONE").length,
      incomplete: tasks.filter((t) => t.status !== "DONE").length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority || (t.isImportant ? "HIGH" : "MEDIUM"),
        completedAt: t.completedAt,
        isPinned: Boolean(t.isPinned),
        isCopied: Boolean(t.isCopied),
      })),
    };

    res.json(summary);
  } catch {
    res.status(500).json({ error: "Failed to fetch task summary" });
  }
});

// Get a single retrospective by id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const row = db
      .prepare("SELECT * FROM retrospectives WHERE id = ?")
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: "Retrospective not found" });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to fetch retrospective" });
  }
});

// Create a new retrospective
router.post("/", (req: Request, res: Response) => {
  const { periodStart, periodEnd, keepText, problemText, tryText } =
    req.body ?? {};

  if (!periodStart || !periodEnd) {
    return res
      .status(400)
      .json({ error: "periodStart and periodEnd are required" });
  }

  try {
    const id = uuidv7();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO retrospectives (id, periodStart, periodEnd, keepText, problemText, tryText, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      periodStart,
      periodEnd,
      keepText || "",
      problemText || "",
      tryText || "",
      now,
      now,
    );

    res.json({
      id,
      periodStart,
      periodEnd,
      keepText: keepText || "",
      problemText: problemText || "",
      tryText: tryText || "",
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    res.status(500).json({ error: "Failed to create retrospective" });
  }
});

// Update a retrospective
router.put("/:id", (req: Request, res: Response) => {
  const { keepText, problemText, tryText } = req.body ?? {};

  try {
    const existing = db
      .prepare("SELECT id FROM retrospectives WHERE id = ?")
      .get(req.params.id);
    if (!existing)
      return res.status(404).json({ error: "Retrospective not found" });

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE retrospectives SET keepText = ?, problemText = ?, tryText = ?, updatedAt = ? WHERE id = ?`,
    ).run(keepText ?? "", problemText ?? "", tryText ?? "", now, req.params.id);

    res.json({ message: "Updated", updatedAt: now });
  } catch {
    res.status(500).json({ error: "Failed to update retrospective" });
  }
});

// Delete a retrospective
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const result = db
      .prepare("DELETE FROM retrospectives WHERE id = ?")
      .run(req.params.id);
    if (result.changes === 0)
      return res.status(404).json({ error: "Retrospective not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete retrospective" });
  }
});

export default router;
