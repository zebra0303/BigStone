import { Router, Request, Response } from "express";
import db from "../db/database";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Get all
router.get("/", (req: Request, res: Response) => {
  const sql = `
    SELECT 
      t.id, t.groupId, t.dueDate, t.status, t.completedAt,
      g.title, g.description, g.isImportant, 
      g.recurringType, g.recurringWeeklyDays, g.recurringMonthlyDay, 
      g.recurringMonthlyNthWeek, g.recurringMonthlyDayOfWeek, 
      g.recurringYearlyMonth, g.recurringYearlyDay, g.notificationMinutesBefore
    FROM todos t
    JOIN todo_groups g ON t.groupId = g.id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Map SQLite row format back to Todo interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = rows.map((r: any) => ({
      id: r.id,
      groupId: r.groupId,
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
  const groupId = uuidv4();
  const todoId = uuidv4();

  const groupSql = `
    INSERT INTO todo_groups (
      id, title, description, isImportant,  
      recurringType, recurringWeeklyDays, recurringMonthlyDay, recurringMonthlyNthWeek, recurringMonthlyDayOfWeek, recurringYearlyMonth, recurringYearlyDay, 
      notificationMinutesBefore
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const groupParams = [
    groupId,
    title,
    description || null,
    isImportant ? 1 : 0,
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
  ];

  db.run(groupSql, groupParams, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    const todoSql = `
      INSERT INTO todos (id, groupId, dueDate, status, completedAt)
      VALUES (?, ?, ?, ?, ?)
    `;
    const todoParams = [
      todoId,
      groupId,
      dueDate,
      status || "TODO",
      null
    ];

    db.run(todoSql, todoParams, function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: todoId, groupId, ...req.body });
    });
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

  // First we need to find the groupId associated with this todo
  db.get("SELECT groupId FROM todos WHERE id = ?", [id], (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Todo not found" });

    const groupId = row.groupId;

    const groupSql = `
      UPDATE todo_groups SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        isImportant = COALESCE(?, isImportant),
        recurringType = ?,
        recurringWeeklyDays = ?,
        recurringMonthlyDay = ?,
        recurringMonthlyNthWeek = ?,
        recurringMonthlyDayOfWeek = ?,
        recurringYearlyMonth = ?,
        recurringYearlyDay = ?
      WHERE id = ?
    `;

    const groupParams = [
      title,
      description,
      isImportant !== undefined ? (isImportant ? 1 : 0) : null,
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
      groupId,
    ];

    db.run(groupSql, groupParams, function (errGroup) {
      if (errGroup) return res.status(500).json({ error: errGroup.message });

      const todoSql = `
        UPDATE todos SET 
          dueDate = COALESCE(?, dueDate),
          status = COALESCE(?, status),
          completedAt = COALESCE(?, completedAt)
        WHERE id = ?
      `;

      const todoParams = [
        dueDate,
        status,
        completedAt,
        id,
      ];

      db.run(todoSql, todoParams, async function (errTodo) {
        if (errTodo) return res.status(500).json({ error: errTodo.message });

        // Backend Task Spawning Logic 
        // If this task was just marked DONE and has recurrence, spawn next occurrence.
        if (status === "DONE" && recurring && recurring.type !== "NONE") {
          try {
            const { getNextOccurrence } = await import("../utils/recurringDate");
            const nextDate = getNextOccurrence(dueDate, recurring);

            if (nextDate) {
              const spawnSql = `
                   INSERT INTO todos (id, groupId, dueDate, status, completedAt)
                   VALUES (?, ?, ?, 'TODO', NULL)
                 `;

              // Import format dynamically if needed, or just ISO string
              const { format } = await import("date-fns-tz");
              db.run(spawnSql, [uuidv4(), groupId, format(nextDate, "yyyy-MM-dd")], (spawnErr) => {
                if (spawnErr) console.error("Could not spawn next task event:", spawnErr.message);
              });
            }
          } catch (e) {
            console.error("Error spanning next date:", e);
          }
        }

        res.json({ message: "Updated", changes: this.changes });
      });
    });
  });
});

// Delete
router.delete("/:id", (req: Request, res: Response) => {
  // If we delete the todo, do we delete the group?
  // Our schema is structured so deleting a group cascades. 
  // Let's find the groupId and delete that, which will cascade.
  db.get("SELECT groupId FROM todos WHERE id = ?", [req.params.id], (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Todo not found" });

    db.run("DELETE FROM todo_groups WHERE id = ?", [row.groupId], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: "Deleted group and instance(s)", changes: this.changes });
    });
  });
});

export default router;
