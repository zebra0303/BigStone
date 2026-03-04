import { Router, Request, Response } from "express";
import db from "../db/database";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Get all
router.get("/", (req: Request, res: Response) => {
  db.all("SELECT * FROM todos", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Map SQLite row format back to Todo interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      isImportant: Boolean(r.isImportant),
      dueDate: r.dueDate,
      status: r.status,
      recurring: {
        type: r.recurringType,
        weeklyDays: r.recurringWeeklyDays
          ? JSON.parse(r.recurringWeeklyDays)
          : undefined,
        monthlyDay: r.recurringMonthlyDay,
        monthlyNthWeek: r.recurringMonthlyNthWeek,
        monthlyDayOfWeek: r.recurringMonthlyDayOfWeek,
        yearlyMonth: r.recurringYearlyMonth,
        yearlyDay: r.recurringYearlyDay,
      },
      notification: r.notificationMinutesBefore
        ? { minutesBefore: r.notificationMinutesBefore }
        : undefined,
      completedAt: r.completedAt,
    }));

    res.json(formatted);
  });
});

// Create
router.post("/", (req: Request, res: Response) => {
  console.log("POST Body:", JSON.stringify(req.body, null, 2));
  const {
    title,
    description,
    isImportant,
    dueDate,
    status,
    recurring,
    notification,
  } = req.body;
  const id = uuidv4();

  const sql = `
    INSERT INTO todos (
      id, title, description, isImportant, dueDate, status, 
      recurringType, recurringWeeklyDays, recurringMonthlyDay, recurringMonthlyNthWeek, recurringMonthlyDayOfWeek, recurringYearlyMonth, recurringYearlyDay, 
      notificationMinutesBefore, completedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    title,
    description || null,
    isImportant ? 1 : 0,
    dueDate,
    status || "TODO",
    recurring?.type || "NONE",
    recurring?.type === "WEEKLY" && recurring?.weeklyDays
      ? JSON.stringify(recurring.weeklyDays)
      : null,
    recurring?.type === "MONTHLY" && recurring?.monthlyDay
      ? recurring.monthlyDay
      : null,
    recurring?.type === "MONTHLY" && recurring?.monthlyNthWeek
      ? recurring.monthlyNthWeek
      : null,
    recurring?.type === "MONTHLY" && recurring?.monthlyDayOfWeek !== undefined
      ? recurring.monthlyDayOfWeek
      : null,
    recurring?.type === "YEARLY" && recurring?.yearlyMonth
      ? recurring.yearlyMonth
      : null,
    recurring?.type === "YEARLY" && recurring?.yearlyDay
      ? recurring.yearlyDay
      : null,
    notification?.minutesBefore || null,
    null,
  ];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, ...req.body });
  });
});

// Update
router.put("/:id", (req: Request, res: Response) => {
  console.log("PUT Body:", JSON.stringify(req.body, null, 2));
  const { id } = req.params;
  const {
    title,
    description,
    isImportant,
    dueDate,
    status,
    completedAt,
    recurring,
  } = req.body;

  const sql = `
    UPDATE todos SET 
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      isImportant = COALESCE(?, isImportant),
      dueDate = COALESCE(?, dueDate),
      status = COALESCE(?, status),
      completedAt = COALESCE(?, completedAt),
      recurringType = ?,
      recurringWeeklyDays = ?,
      recurringMonthlyDay = ?,
      recurringMonthlyNthWeek = ?,
      recurringMonthlyDayOfWeek = ?,
      recurringYearlyMonth = ?,
      recurringYearlyDay = ?
    WHERE id = ?
  `;

  const params = [
    title,
    description,
    isImportant !== undefined ? (isImportant ? 1 : 0) : null,
    dueDate,
    status,
    completedAt,
    recurring?.type || "NONE",
    recurring?.type === "WEEKLY" && recurring?.weeklyDays
      ? JSON.stringify(recurring.weeklyDays)
      : null,
    recurring?.type === "MONTHLY" && recurring?.monthlyDay
      ? recurring.monthlyDay
      : null,
    recurring?.type === "MONTHLY" && recurring?.monthlyNthWeek
      ? recurring.monthlyNthWeek
      : null,
    recurring?.type === "MONTHLY" && recurring?.monthlyDayOfWeek !== undefined
      ? recurring.monthlyDayOfWeek
      : null,
    recurring?.type === "YEARLY" && recurring?.yearlyMonth
      ? recurring.yearlyMonth
      : null,
    recurring?.type === "YEARLY" && recurring?.yearlyDay
      ? recurring.yearlyDay
      : null,
    id,
  ];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Updated", changes: this.changes });
  });
});

// Delete
router.delete("/:id", (req: Request, res: Response) => {
  db.run("DELETE FROM todos WHERE id = ?", req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted", changes: this.changes });
  });
});

export default router;
