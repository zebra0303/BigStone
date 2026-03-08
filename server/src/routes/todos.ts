import { Router, Request, Response } from "express";
import db from "../db/database";
import { v7 as uuidv7 } from "uuid";
import { requireAdmin } from "../middleware/auth";
import { formatInTimeZone } from "date-fns-tz";

const router = Router();

// Get all
router.get("/", (req: Request, res: Response) => {
  const sql = `
    SELECT
      t.id, t.groupId, t.dueDate, t.status, t.completedAt,
      g.title, g.description, g.isImportant, g.priority,
      g.recurringType, g.recurringWeeklyDays, g.recurringMonthlyDay,
      g.recurringMonthlyNthWeek, g.recurringMonthlyDayOfWeek,
      g.recurringYearlyMonth, g.recurringYearlyDay, g.notificationMinutesBefore,
      g.slackEnabled, g.slackNotificationTime, g.isPinned, g.isCopied,
      g.startDate, g.endOption, g.endDate, g.endOccurrences, g.occurrenceCount,
      (
        SELECT json_group_array(json_object(
          'id', a.id,
          'groupId', a.groupId,
          'originalName', a.originalName,
          'filename', a.filename,
          'size', a.size,
          'createdAt', a.createdAt
        ))
        FROM todo_attachments a
        WHERE a.groupId = g.id
      ) as attachments
    FROM todos t
    JOIN todo_groups g ON t.groupId = g.id
  `;

  try {
    const rows = db.prepare(sql).all() as any[];

    // Map SQLite row format back to Todo interface
    const formatted = rows.map((r: any) => ({
      id: r.id,
      groupId: r.groupId,
      title: r.title,
      description: r.description,
      isImportant: Boolean(r.isImportant),
      priority: r.priority || (r.isImportant ? "HIGH" : "MEDIUM"), // migration fallback
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
        startDate: r.startDate,
        endOption: r.endOption,
        endDate: r.endDate,
        endOccurrences: r.endOccurrences,
        occurrenceCount: r.occurrenceCount,
      },
      notification: r.notificationMinutesBefore
        ? { minutesBefore: r.notificationMinutesBefore }
        : undefined,
      slackNotification: {
        enabled: Boolean(r.slackEnabled),
        time: r.slackNotificationTime || "09:00",
      },
      isPinned: Boolean(r.isPinned),
      isCopied: Boolean(r.isCopied),
      completedAt: r.completedAt,
      attachments: r.attachments ? JSON.parse(r.attachments) : [],
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create
router.post("/", requireAdmin, (req: Request, res: Response) => {
  const {
    title,
    description,
    isImportant,
    isPinned,
    priority,
    dueDate,
    status,
    recurring,
    notification,
    slackNotification,
  } = req.body;
  const groupId = uuidv7();
  const todoId = uuidv7();

  const effectivePriority = priority || (isImportant ? "HIGH" : "MEDIUM");

  // Pinned tasks are mutually exclusive with recurring
  const effectiveRecurringType = isPinned ? "NONE" : recurring?.type || "NONE";

  const groupSql = `
    INSERT INTO todo_groups (
      id, title, description, isImportant, priority, isPinned,
      recurringType, recurringWeeklyDays, recurringMonthlyDay, recurringMonthlyNthWeek, recurringMonthlyDayOfWeek, recurringYearlyMonth, recurringYearlyDay,
      notificationMinutesBefore, slackEnabled, slackNotificationTime, startDate, endOption, endDate, endOccurrences, occurrenceCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `;

  const groupParams = [
    groupId,
    title,
    description || null,
    isImportant ? 1 : 0, // Keep for backward compatibility
    effectivePriority,
    isPinned ? 1 : 0,
    effectiveRecurringType,
    effectiveRecurringType === "WEEKLY" && recurring?.weeklyDays
      ? JSON.stringify(recurring.weeklyDays)
      : null,
    effectiveRecurringType === "MONTHLY" && recurring?.monthlyDay
      ? recurring.monthlyDay
      : null,
    effectiveRecurringType === "MONTHLY" && recurring?.monthlyNthWeek
      ? recurring.monthlyNthWeek
      : null,
    effectiveRecurringType === "MONTHLY" &&
    recurring?.monthlyDayOfWeek !== undefined
      ? recurring.monthlyDayOfWeek
      : null,
    effectiveRecurringType === "YEARLY" && recurring?.yearlyMonth
      ? recurring.yearlyMonth
      : null,
    effectiveRecurringType === "YEARLY" && recurring?.yearlyDay
      ? recurring.yearlyDay
      : null,
    notification?.minutesBefore || null,
    slackNotification?.enabled ? 1 : 0,
    slackNotification?.time || null,
    recurring?.startDate || dueDate,
    recurring?.endOption || "NONE",
    recurring?.endDate || null,
    recurring?.endOccurrences || null,
  ];

  try {
    db.prepare(groupSql).run(...groupParams);

    const todoSql = `
      INSERT INTO todos (id, groupId, dueDate, status, completedAt)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.prepare(todoSql).run(todoId, groupId, dueDate, status || "TODO", null);

    res.json({ id: todoId, groupId, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update
router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  // Fetch the existing todo + group combined
  const fetchSql = `
    SELECT
      t.id, t.groupId, t.dueDate, t.status, t.completedAt,
      g.title, g.description, g.isImportant, g.priority,
      g.recurringType, g.recurringWeeklyDays, g.recurringMonthlyDay,
      g.recurringMonthlyNthWeek, g.recurringMonthlyDayOfWeek,
      g.recurringYearlyMonth, g.recurringYearlyDay, g.notificationMinutesBefore,
      g.slackEnabled, g.slackNotificationTime, g.isPinned,
      g.startDate, g.endOption, g.endDate, g.endOccurrences, g.occurrenceCount
    FROM todos t
    JOIN todo_groups g ON t.groupId = g.id
    WHERE t.id = ?
  `;

  try {
    const row = db.prepare(fetchSql).get(id) as any;
    if (!row) return res.status(404).json({ error: "Todo not found" });

    // Identify effective values
    const effectiveIsPinned =
      updates.isPinned !== undefined
        ? updates.isPinned
          ? 1
          : 0
        : row.isPinned;

    const effectiveSlackEnabled =
      updates.slackNotification?.enabled !== undefined
        ? updates.slackNotification.enabled
          ? 1
          : 0
        : row.slackEnabled;
    const effectiveSlackTime =
      updates.slackNotification?.time !== undefined
        ? updates.slackNotification.time
        : row.slackNotificationTime;

    const effectiveTitle =
      updates.title !== undefined ? updates.title : row.title;
    const effectiveDesc =
      updates.description !== undefined ? updates.description : row.description;
    const effectiveImportant =
      updates.isImportant !== undefined
        ? updates.isImportant
          ? 1
          : 0
        : row.isImportant;
    const effectivePriority =
      updates.priority !== undefined
        ? updates.priority
        : row.priority || (effectiveImportant ? "HIGH" : "MEDIUM");

    // We expect `recurring` as an object if sent from frontend
    let effRecType = row.recurringType;
    let effRecWeekly = row.recurringWeeklyDays
      ? JSON.parse(row.recurringWeeklyDays)
      : null;
    let effRecMonthDay = row.recurringMonthlyDay;
    let effRecMonthNth = row.recurringMonthlyNthWeek;
    let effRecMonthDOW = row.recurringMonthlyDayOfWeek;
    let effRecYearMonth = row.recurringYearlyMonth;
    let effRecYearDay = row.recurringYearlyDay;

    let effStartDate = row.startDate;
    let effEndOption = row.endOption;
    let effEndDate = row.endDate;
    let effEndOccurrences = row.endOccurrences;

    if (updates.recurring) {
      effRecType = updates.recurring.type;
      effRecWeekly = updates.recurring.weeklyDays || null;
      effRecMonthDay = updates.recurring.monthlyDay || null;
      effRecMonthNth = updates.recurring.monthlyNthWeek || null;
      effRecMonthDOW =
        updates.recurring.monthlyDayOfWeek !== undefined
          ? updates.recurring.monthlyDayOfWeek
          : null;
      effRecYearMonth = updates.recurring.yearlyMonth || null;
      effRecYearDay = updates.recurring.yearlyDay || null;
      effStartDate =
        updates.recurring.startDate !== undefined
          ? updates.recurring.startDate
          : row.startDate;
      effEndOption =
        updates.recurring.endOption !== undefined
          ? updates.recurring.endOption
          : row.endOption;
      effEndDate =
        updates.recurring.endDate !== undefined
          ? updates.recurring.endDate
          : row.endDate;
      effEndOccurrences =
        updates.recurring.endOccurrences !== undefined
          ? updates.recurring.endOccurrences
          : row.endOccurrences;
    }

    const effectiveDueDate =
      updates.dueDate !== undefined ? updates.dueDate : row.dueDate;
    const effectiveStatus =
      updates.status !== undefined ? updates.status : row.status;
    const effectiveCompletedAt =
      updates.completedAt !== undefined ? updates.completedAt : row.completedAt;

    const groupId = row.groupId;

    // Pinned tasks force recurringType to NONE
    if (effectiveIsPinned) {
      effRecType = "NONE";
    }

    const groupSql = `
      UPDATE todo_groups SET
        title = ?, description = ?, isImportant = ?, priority = ?, isPinned = ?,
        recurringType = ?, recurringWeeklyDays = ?, recurringMonthlyDay = ?,
        recurringMonthlyNthWeek = ?, recurringMonthlyDayOfWeek = ?,
        recurringYearlyMonth = ?, recurringYearlyDay = ?,
        slackEnabled = ?, slackNotificationTime = ?,
        startDate = ?, endOption = ?, endDate = ?, endOccurrences = ?
      WHERE id = ?
    `;

    const groupParams = [
      effectiveTitle,
      effectiveDesc,
      effectiveImportant,
      effectivePriority,
      effectiveIsPinned,
      effRecType,
      effRecWeekly ? JSON.stringify(effRecWeekly) : null,
      effRecMonthDay,
      effRecMonthNth,
      effRecMonthDOW,
      effRecYearMonth,
      effRecYearDay,
      effectiveSlackEnabled,
      effectiveSlackTime,
      effStartDate,
      effEndOption,
      effEndDate,
      effEndOccurrences,
      groupId,
    ];

    db.prepare(groupSql).run(...groupParams);

    const todoSql = `
      UPDATE todos SET dueDate = ?, status = ?, completedAt = ? WHERE id = ?
    `;
    const todoResult = db
      .prepare(todoSql)
      .run(effectiveDueDate, effectiveStatus, effectiveCompletedAt, id);

    // Backend Task Spawning Logic
    if (
      effectiveStatus === "DONE" &&
      row.status !== "DONE" &&
      effRecType !== "NONE"
    ) {
      // Check count condition
      if (
        effEndOption === "OCCURRENCES" &&
        effEndOccurrences &&
        row.occurrenceCount >= effEndOccurrences
      ) {
        return res.json({ message: "Updated", changes: todoResult.changes });
      }

      const { getNextOccurrence } = await import("../utils/recurringDate");
      const nextDate = getNextOccurrence(
        effectiveDueDate,
        {
          type: effRecType,
          weeklyDays: effRecWeekly,
          monthlyDay: effRecMonthDay,
          monthlyNthWeek: effRecMonthNth,
          monthlyDayOfWeek: effRecMonthDOW,
          yearlyMonth: effRecYearMonth,
          yearlyDay: effRecYearDay,
        },
        true, // ignoreToday=true ensures we sequentially spawn missed past dates
      );

      if (nextDate) {
        // Check date condition
        if (effEndOption === "DATE" && effEndDate) {
          const { startOfDay } = await import("date-fns");
          if (nextDate.getTime() > startOfDay(new Date(effEndDate)).getTime()) {
            return res.json({
              message: "Updated",
              changes: todoResult.changes,
            });
          }
        }

        const { format } = await import("date-fns-tz");
        const nextDateStr = format(nextDate, "yyyy-MM-dd");

        const existing = db
          .prepare("SELECT id FROM todos WHERE groupId = ? AND dueDate = ?")
          .get(groupId, nextDateStr);
        if (existing) {
          return res.json({ message: "Updated", changes: todoResult.changes });
        }

        const spawnSql = `
          INSERT INTO todos (id, groupId, dueDate, status, completedAt)
          VALUES (?, ?, ?, 'TODO', NULL)
        `;
        db.prepare(spawnSql).run(uuidv7(), groupId, nextDateStr);

        // Increment occurrence count
        db.prepare(
          "UPDATE todo_groups SET occurrenceCount = occurrenceCount + 1 WHERE id = ?",
        ).run(groupId);
      }

      return res.json({ message: "Updated", changes: todoResult.changes });
    } else if (
      effectiveStatus === "TODO" &&
      row.status === "DONE" &&
      effRecType !== "NONE"
    ) {
      // Rollback: Delete any auto-spawned future tasks for this group
      const rollbackSql = `
        DELETE FROM todos
        WHERE groupId = ? AND status = 'TODO' AND dueDate > ?
      `;
      const rollbackResult = db.prepare(rollbackSql).run(groupId, row.dueDate);
      if (rollbackResult.changes > 0) {
        db.prepare(
          "UPDATE todo_groups SET occurrenceCount = occurrenceCount - ? WHERE id = ?",
        ).run(rollbackResult.changes, groupId);
        return res.json({
          message: "Updated and rolled back",
          changes: rollbackResult.changes,
        });
      }
    }

    res.json({ message: "Updated", changes: todoResult.changes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Complete Virtual Task (Skip intermediate)
router.post(
  "/:id/complete-virtual",
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { targetDate } = req.body; // YYYY-MM-DD

    const fetchSql = `
    SELECT
      t.id, t.groupId, t.dueDate, t.status, t.completedAt,
      g.title, g.description, g.isImportant,
      g.recurringType, g.recurringWeeklyDays, g.recurringMonthlyDay,
      g.recurringMonthlyNthWeek, g.recurringMonthlyDayOfWeek,
      g.recurringYearlyMonth, g.recurringYearlyDay, g.notificationMinutesBefore,
      g.startDate, g.endOption, g.endDate, g.endOccurrences, g.occurrenceCount
    FROM todos t
    JOIN todo_groups g ON t.groupId = g.id
    WHERE t.id = ?
  `;

    try {
      const row = db.prepare(fetchSql).get(id) as any;
      if (!row) return res.status(404).json({ error: "Base task not found" });

      const { getNextOccurrence } = await import("../utils/recurringDate");
      const { startOfDay } = await import("date-fns");
      const { format: formatTz } = await import("date-fns-tz");

      const recConfig = {
        type: row.recurringType,
        weeklyDays: row.recurringWeeklyDays
          ? JSON.parse(row.recurringWeeklyDays)
          : null,
        monthlyDay: row.recurringMonthlyDay,
        monthlyNthWeek: row.recurringMonthlyNthWeek,
        monthlyDayOfWeek: row.recurringMonthlyDayOfWeek,
        yearlyMonth: row.recurringYearlyMonth,
        yearlyDay: row.recurringYearlyDay,
      };

      let currentDate = new Date(row.dueDate);
      const targetDateObj = new Date(targetDate);
      const datesToInsert = [];
      let newInstances = 0;

      while (true) {
        const nextDate = getNextOccurrence(currentDate, recConfig, true);
        if (!nextDate) break;

        const nextDateMs = startOfDay(nextDate).getTime();
        const targetDateMs = startOfDay(targetDateObj).getTime();

        if (nextDateMs > targetDateMs) {
          break; // past the target
        }

        datesToInsert.push(nextDate);
        currentDate = nextDate;
        newInstances++;

        if (nextDateMs === targetDateMs) {
          break;
        }
      }

      if (datesToInsert.length === 0) {
        return res
          .status(400)
          .json({ error: "Target date is not a valid future occurrence." });
      }

      const allInserts = datesToInsert.map((d) => ({
        date: d,
        status:
          startOfDay(d).getTime() === startOfDay(targetDateObj).getTime()
            ? "DONE"
            : "TODO",
      }));

      // Generate one more occurrence to act as the next pending task
      const nextAfterTarget = getNextOccurrence(currentDate, recConfig, true);
      if (nextAfterTarget) {
        const nextMs = startOfDay(nextAfterTarget).getTime();
        let canSpawn = true;
        if (row.endOption === "DATE" && row.endDate) {
          if (nextMs > startOfDay(new Date(row.endDate)).getTime())
            canSpawn = false;
        }
        if (row.endOption === "OCCURRENCES" && row.endOccurrences) {
          if (row.occurrenceCount + newInstances >= row.endOccurrences)
            canSpawn = false;
        }

        if (canSpawn) {
          allInserts.push({ date: nextAfterTarget, status: "TODO" });
        }
      }

      // Use a transaction for batch insert
      const insertStmt = db.prepare(
        `INSERT INTO todos (id, groupId, dueDate, status, completedAt) VALUES (?, ?, ?, ?, ?)`,
      );
      const insertMany = db.transaction((items: typeof allInserts) => {
        for (const item of items) {
          const isDone = item.status === "DONE";
          const completedStr = isDone ? new Date().toISOString() : null;
          insertStmt.run(
            uuidv7(),
            row.groupId,
            formatTz(item.date, "yyyy-MM-dd"),
            item.status,
            completedStr,
          );
        }
      });
      insertMany(allInserts);

      const totalInstances = allInserts.length;
      db.prepare(
        "UPDATE todo_groups SET occurrenceCount = occurrenceCount + ? WHERE id = ?",
      ).run(totalInstances, row.groupId);

      res.json({ message: "Successfully skipped and completed virtual task." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// Copy to Today (create a one-time copy of a task for today)
router.post(
  "/:id/copy-to-today",
  requireAdmin,
  (req: Request, res: Response) => {
    const { id } = req.params;

    const fetchSql = `
      SELECT t.groupId, g.title, g.description, g.isImportant, g.priority,
             g.slackEnabled, g.slackNotificationTime, g.notificationMinutesBefore
      FROM todos t
      JOIN todo_groups g ON t.groupId = g.id
      WHERE t.id = ?
    `;

    try {
      const row = db.prepare(fetchSql).get(id) as any;
      if (!row) return res.status(404).json({ error: "Todo not found" });

      // Use admin timezone for correct "today" date
      const tzRow = db
        .prepare("SELECT value FROM system_settings WHERE key = 'timezone'")
        .get() as any;
      const timezone = tzRow?.value || "Asia/Seoul";
      const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
      const newGroupId = uuidv7();
      const newTodoId = uuidv7();

      // Create a non-recurring copy marked as isCopied
      const groupSql = `
        INSERT INTO todo_groups (
          id, title, description, isImportant, priority, isCopied,
          recurringType, slackEnabled, slackNotificationTime,
          notificationMinutesBefore, startDate, endOption, occurrenceCount
        ) VALUES (?, ?, ?, ?, ?, 1, 'NONE', ?, ?, ?, ?, 'NONE', 1)
      `;
      db.prepare(groupSql).run(
        newGroupId,
        row.title,
        row.description,
        row.isImportant,
        row.priority,
        row.slackEnabled,
        row.slackNotificationTime,
        row.notificationMinutesBefore,
        today,
      );

      const todoSql = `
        INSERT INTO todos (id, groupId, dueDate, status, completedAt)
        VALUES (?, ?, ?, 'TODO', NULL)
      `;
      db.prepare(todoSql).run(newTodoId, newGroupId, today);

      res.json({ id: newTodoId, groupId: newGroupId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Delete
router.delete("/:id", requireAdmin, (req: Request, res: Response) => {
  // If we delete the todo, do we delete the group?
  // Our schema is structured so deleting a group cascades.
  // Let's find the groupId and delete that, which will cascade.
  try {
    const row = db
      .prepare("SELECT groupId FROM todos WHERE id = ?")
      .get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: "Todo not found" });

    const result = db
      .prepare("DELETE FROM todo_groups WHERE id = ?")
      .run(row.groupId);
    res.json({
      message: "Deleted group and instance(s)",
      changes: result.changes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
