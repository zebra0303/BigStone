import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import db from "../db/database";
import { v7 as uuidv7 } from "uuid";
import { startOfDay } from "date-fns";
import { format, formatInTimeZone } from "date-fns-tz";
import { requireAdmin } from "../middleware/auth";
import { getNextOccurrence, safeParseDate } from "../utils/recurringDate";

const router = Router();
const UPLOAD_DIR = path.resolve(__dirname, "../../data/uploads");
const DATE_STR_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_VIRTUAL_ITERATIONS = 1000;

// Require admin authentication on all todo routes (previously GET / was public)
router.use(requireAdmin);

// Get all
router.get("/", (_req: Request, res: Response) => {
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

    const formatted = rows.map((r: any) => ({
      id: r.id,
      groupId: r.groupId,
      title: r.title,
      description: r.description,
      isImportant: Boolean(r.isImportant),
      priority: r.priority || (r.isImportant ? "HIGH" : "MEDIUM"),
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
  } catch {
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

// Create
router.post("/", (req: Request, res: Response) => {
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
  } = req.body ?? {};

  if (typeof title !== "string" || !title.trim() || !dueDate) {
    return res.status(400).json({ error: "Title and dueDate are required" });
  }

  const groupId = uuidv7();
  const todoId = uuidv7();
  const effectivePriority = priority || (isImportant ? "HIGH" : "MEDIUM");
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
    title.trim(),
    description || null,
    isImportant ? 1 : 0,
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
    // Wrap multi-table insert in a transaction to avoid orphaned todo_groups rows
    const createTx = db.transaction(() => {
      db.prepare(groupSql).run(...groupParams);
      db.prepare(
        `INSERT INTO todos (id, groupId, dueDate, status, completedAt)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(todoId, groupId, dueDate, status || "TODO", null);
    });
    createTx();

    res.json({ id: todoId, groupId, ...req.body });
  } catch {
    res.status(500).json({ error: "Failed to create todo" });
  }
});

// Update
router.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body ?? {};

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
    // Execute read, update, and recurring spawn/rollback atomically inside one transaction
    const updateTx = db.transaction(
      (): { status: number; body: Record<string, unknown> } => {
        const row = db.prepare(fetchSql).get(id) as any;
        if (!row) return { status: 404, body: { error: "Todo not found" } };

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
          updates.description !== undefined
            ? updates.description
            : row.description;
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
          updates.completedAt !== undefined
            ? updates.completedAt
            : row.completedAt;

        const groupId = row.groupId;

        if (effectiveIsPinned) {
          effRecType = "NONE";
        }

        db.prepare(
          `
        UPDATE todo_groups SET
          title = ?, description = ?, isImportant = ?, priority = ?, isPinned = ?,
          recurringType = ?, recurringWeeklyDays = ?, recurringMonthlyDay = ?,
          recurringMonthlyNthWeek = ?, recurringMonthlyDayOfWeek = ?,
          recurringYearlyMonth = ?, recurringYearlyDay = ?,
          slackEnabled = ?, slackNotificationTime = ?,
          startDate = ?, endOption = ?, endDate = ?, endOccurrences = ?
        WHERE id = ?
      `,
        ).run(
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
        );

        const todoResult = db
          .prepare(
            `UPDATE todos SET dueDate = ?, status = ?, completedAt = ? WHERE id = ?`,
          )
          .run(effectiveDueDate, effectiveStatus, effectiveCompletedAt, id);

        const isTransitionToDone =
          effectiveStatus === "DONE" && row.status !== "DONE";
        const isRecurrenceChangeWhileDone =
          effectiveStatus === "DONE" &&
          row.status === "DONE" &&
          updates.recurring != null;

        if (
          (isTransitionToDone || isRecurrenceChangeWhileDone) &&
          effRecType !== "NONE"
        ) {
          let adjustedOccurrenceCount = Number(row.occurrenceCount) || 0;

          if (isRecurrenceChangeWhileDone) {
            const cleanupResult = db
              .prepare(
                "DELETE FROM todos WHERE groupId = ? AND status = 'TODO' AND dueDate > ?",
              )
              .run(groupId, effectiveDueDate);
            if (cleanupResult.changes > 0) {
              adjustedOccurrenceCount = Math.max(
                0,
                adjustedOccurrenceCount - cleanupResult.changes,
              );
              // Clamp occurrenceCount to prevent negative values
              db.prepare(
                "UPDATE todo_groups SET occurrenceCount = MAX(0, occurrenceCount - ?) WHERE id = ?",
              ).run(cleanupResult.changes, groupId);
            }
          }

          if (
            effEndOption === "OCCURRENCES" &&
            effEndOccurrences &&
            adjustedOccurrenceCount >= effEndOccurrences
          ) {
            return {
              status: 200,
              body: { message: "Updated", changes: todoResult.changes },
            };
          }

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
            true,
          );

          if (nextDate) {
            if (effEndOption === "DATE" && effEndDate) {
              if (
                nextDate.getTime() >
                startOfDay(safeParseDate(effEndDate)).getTime()
              ) {
                return {
                  status: 200,
                  body: { message: "Updated", changes: todoResult.changes },
                };
              }
            }

            const nextDateStr = format(nextDate, "yyyy-MM-dd");

            const existing = db
              .prepare("SELECT id FROM todos WHERE groupId = ? AND dueDate = ?")
              .get(groupId, nextDateStr);
            if (existing) {
              return {
                status: 200,
                body: { message: "Updated", changes: todoResult.changes },
              };
            }

            db.prepare(
              `INSERT INTO todos (id, groupId, dueDate, status, completedAt)
             VALUES (?, ?, ?, 'TODO', NULL)`,
            ).run(uuidv7(), groupId, nextDateStr);

            db.prepare(
              "UPDATE todo_groups SET occurrenceCount = occurrenceCount + 1 WHERE id = ?",
            ).run(groupId);
          }

          return {
            status: 200,
            body: { message: "Updated", changes: todoResult.changes },
          };
        } else if (
          effectiveStatus !== "DONE" &&
          row.status === "DONE" &&
          effRecType !== "NONE"
        ) {
          const rollbackResult = db
            .prepare(
              `DELETE FROM todos
             WHERE groupId = ? AND status = 'TODO' AND dueDate > ?`,
            )
            .run(groupId, row.dueDate);
          if (rollbackResult.changes > 0) {
            db.prepare(
              "UPDATE todo_groups SET occurrenceCount = MAX(0, occurrenceCount - ?) WHERE id = ?",
            ).run(rollbackResult.changes, groupId);
            return {
              status: 200,
              body: {
                message: "Updated and rolled back",
                changes: rollbackResult.changes,
              },
            };
          }
        }

        return {
          status: 200,
          body: { message: "Updated", changes: todoResult.changes },
        };
      },
    );

    const outcome = updateTx();
    res.status(outcome.status).json(outcome.body);
  } catch {
    res.status(500).json({ error: "Failed to update todo" });
  }
});

// Complete Virtual Task (Skip intermediate)
router.post("/:id/complete-virtual", (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetDate } = req.body ?? {};

  if (typeof targetDate !== "string" || !DATE_STR_REGEX.test(targetDate)) {
    return res
      .status(400)
      .json({ error: "Valid targetDate (YYYY-MM-DD) is required." });
  }

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
    const completeTx = db.transaction(
      (): { status: number; body: Record<string, unknown> } => {
        const row = db.prepare(fetchSql).get(id) as any;
        if (!row)
          return { status: 404, body: { error: "Base task not found" } };

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

        // Use safeParseDate for both base and target to avoid UTC vs local midnight mismatch
        let currentDate = safeParseDate(row.dueDate);
        const targetDateObj = safeParseDate(targetDate);
        const targetDateMs = startOfDay(targetDateObj).getTime();
        const datesToInsert: Date[] = [];
        let iterations = 0;

        // Cap loop iterations to prevent DoS from far-future targetDate inputs
        while (iterations < MAX_VIRTUAL_ITERATIONS) {
          const nextDate = getNextOccurrence(currentDate, recConfig, true);
          if (!nextDate) break;

          const nextDateMs = startOfDay(nextDate).getTime();
          if (nextDateMs > targetDateMs) {
            break;
          }

          datesToInsert.push(nextDate);
          currentDate = nextDate;
          iterations++;

          if (nextDateMs === targetDateMs) {
            break;
          }
        }

        if (
          iterations >= MAX_VIRTUAL_ITERATIONS &&
          startOfDay(currentDate).getTime() < targetDateMs
        ) {
          return {
            status: 400,
            body: { error: "Target date is too far in the future." },
          };
        }

        if (datesToInsert.length === 0) {
          return {
            status: 400,
            body: { error: "Target date is not a valid future occurrence." },
          };
        }

        const allInserts = datesToInsert.map((d) => ({
          date: d,
          status: startOfDay(d).getTime() === targetDateMs ? "DONE" : "TODO",
        }));

        const nextAfterTarget = getNextOccurrence(currentDate, recConfig, true);
        if (nextAfterTarget) {
          const nextMs = startOfDay(nextAfterTarget).getTime();
          let canSpawn = true;
          if (row.endOption === "DATE" && row.endDate) {
            if (nextMs > startOfDay(safeParseDate(row.endDate)).getTime()) {
              canSpawn = false;
            }
          }
          if (row.endOption === "OCCURRENCES" && row.endOccurrences) {
            if (
              row.occurrenceCount + datesToInsert.length >=
              row.endOccurrences
            ) {
              canSpawn = false;
            }
          }

          if (canSpawn) {
            allInserts.push({ date: nextAfterTarget, status: "TODO" });
          }
        }

        // Skip dates that already exist for this group to prevent duplicate rows
        const existingRows = db
          .prepare("SELECT dueDate FROM todos WHERE groupId = ?")
          .all(row.groupId) as { dueDate: string }[];
        const existingDates = new Set(existingRows.map((r) => r.dueDate));

        const insertStmt = db.prepare(
          `INSERT INTO todos (id, groupId, dueDate, status, completedAt) VALUES (?, ?, ?, ?, ?)`,
        );
        let insertedCount = 0;
        for (const item of allInserts) {
          const dateStr = format(item.date, "yyyy-MM-dd");
          if (existingDates.has(dateStr)) continue;
          existingDates.add(dateStr);

          const isDone = item.status === "DONE";
          const completedStr = isDone ? new Date().toISOString() : null;
          insertStmt.run(
            uuidv7(),
            row.groupId,
            dateStr,
            item.status,
            completedStr,
          );
          insertedCount++;
        }

        if (insertedCount > 0) {
          db.prepare(
            "UPDATE todo_groups SET occurrenceCount = occurrenceCount + ? WHERE id = ?",
          ).run(insertedCount, row.groupId);
        }

        return {
          status: 200,
          body: { message: "Successfully skipped and completed virtual task." },
        };
      },
    );

    const outcome = completeTx();
    res.status(outcome.status).json(outcome.body);
  } catch {
    res.status(500).json({ error: "Failed to complete virtual task" });
  }
});

// Copy to Today (create a one-time copy of a task for today)
router.post("/:id/copy-to-today", (req: Request, res: Response) => {
  const { id } = req.params;

  const fetchSql = `
    SELECT t.groupId, g.title, g.description, g.isImportant, g.priority,
           g.slackEnabled, g.slackNotificationTime, g.notificationMinutesBefore
    FROM todos t
    JOIN todo_groups g ON t.groupId = g.id
    WHERE t.id = ?
  `;

  try {
    const copyTx = db.transaction(
      (): { status: number; body: Record<string, unknown> } => {
        const row = db.prepare(fetchSql).get(id) as any;
        if (!row) return { status: 404, body: { error: "Todo not found" } };

        const tzRow = db
          .prepare("SELECT value FROM system_settings WHERE key = 'timezone'")
          .get() as { value: string } | undefined;
        const timezone = tzRow?.value || "Asia/Seoul";
        const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
        const newGroupId = uuidv7();
        const newTodoId = uuidv7();

        db.prepare(
          `
        INSERT INTO todo_groups (
          id, title, description, isImportant, priority, isCopied,
          recurringType, slackEnabled, slackNotificationTime,
          notificationMinutesBefore, startDate, endOption, occurrenceCount
        ) VALUES (?, ?, ?, ?, ?, 1, 'NONE', ?, ?, ?, ?, 'NONE', 1)
      `,
        ).run(
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

        db.prepare(
          `INSERT INTO todos (id, groupId, dueDate, status, completedAt)
         VALUES (?, ?, ?, 'TODO', NULL)`,
        ).run(newTodoId, newGroupId, today);

        return { status: 200, body: { id: newTodoId, groupId: newGroupId } };
      },
    );

    const outcome = copyTx();
    res.status(outcome.status).json(outcome.body);
  } catch {
    res.status(500).json({ error: "Failed to copy task to today" });
  }
});

// Delete
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const row = db
      .prepare("SELECT groupId FROM todos WHERE id = ?")
      .get(req.params.id) as { groupId: string } | undefined;
    if (!row) return res.status(404).json({ error: "Todo not found" });

    // Query attachment filenames before cascading delete so physical files are not orphaned on disk
    const attachments = db
      .prepare("SELECT filename FROM todo_attachments WHERE groupId = ?")
      .all(row.groupId) as { filename: string }[];

    const result = db
      .prepare("DELETE FROM todo_groups WHERE id = ?")
      .run(row.groupId);

    for (const att of attachments) {
      const safeName = path.basename(att.filename);
      const resolved = path.resolve(UPLOAD_DIR, safeName);
      if (resolved.startsWith(UPLOAD_DIR + path.sep)) {
        try {
          if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
        } catch {
          /* ignore cleanup errors */
        }
      }
    }

    res.json({
      message: "Deleted group and instance(s)",
      changes: result.changes,
    });
  } catch {
    res.status(500).json({ error: "Failed to delete todo" });
  }
});

export default router;
