import { Router, Request, Response } from "express";
import db from "../db/database";
import { v4 as uuidv4 } from "uuid";

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
      g.startDate, g.endOption, g.endDate, g.endOccurrences, g.occurrenceCount
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
    priority,
    dueDate,
    status,
    recurring,
    notification,
  } = req.body;
  const groupId = uuidv4();
  const todoId = uuidv4();

  const effectivePriority = priority || (isImportant ? "HIGH" : "MEDIUM");

  const groupSql = `
    INSERT INTO todo_groups (
      id, title, description, isImportant, priority,
      recurringType, recurringWeeklyDays, recurringMonthlyDay, recurringMonthlyNthWeek, recurringMonthlyDayOfWeek, recurringYearlyMonth, recurringYearlyDay, 
      notificationMinutesBefore, startDate, endOption, endDate, endOccurrences, occurrenceCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `;

  const groupParams = [
    groupId,
    title,
    description || null,
    isImportant ? 1 : 0, // Keep for backward compatibility
    effectivePriority,
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
    recurring?.startDate || dueDate,
    recurring?.endOption || "NONE",
    recurring?.endDate || null,
    recurring?.endOccurrences || null,
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
  const updates = req.body;

  // Fetch the existing todo + group combined
  const fetchSql = `
    SELECT 
      t.id, t.groupId, t.dueDate, t.status, t.completedAt,
      g.title, g.description, g.isImportant, g.priority,
      g.recurringType, g.recurringWeeklyDays, g.recurringMonthlyDay, 
      g.recurringMonthlyNthWeek, g.recurringMonthlyDayOfWeek, 
      g.recurringYearlyMonth, g.recurringYearlyDay, g.notificationMinutesBefore,
      g.startDate, g.endOption, g.endDate, g.endOccurrences, g.occurrenceCount
    FROM todos t
    JOIN todo_groups g ON t.groupId = g.id
    WHERE t.id = ?
  `;

  db.get(fetchSql, [id], (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Todo not found" });

    // Identify effective values
    const effectiveTitle = updates.title !== undefined ? updates.title : row.title;
    const effectiveDesc = updates.description !== undefined ? updates.description : row.description;
    const effectiveImportant = updates.isImportant !== undefined ? (updates.isImportant ? 1 : 0) : row.isImportant;
    const effectivePriority = updates.priority !== undefined ? updates.priority : (row.priority || (effectiveImportant ? "HIGH" : "MEDIUM"));

    // We expect `recurring` as an object if sent from frontend
    let effRecType = row.recurringType;
    let effRecWeekly = row.recurringWeeklyDays ? JSON.parse(row.recurringWeeklyDays) : null;
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
      effRecMonthDOW = updates.recurring.monthlyDayOfWeek !== undefined ? updates.recurring.monthlyDayOfWeek : null;
      effRecYearMonth = updates.recurring.yearlyMonth || null;
      effRecYearDay = updates.recurring.yearlyDay || null;
      effStartDate = updates.recurring.startDate !== undefined ? updates.recurring.startDate : row.startDate;
      effEndOption = updates.recurring.endOption !== undefined ? updates.recurring.endOption : row.endOption;
      effEndDate = updates.recurring.endDate !== undefined ? updates.recurring.endDate : row.endDate;
      effEndOccurrences = updates.recurring.endOccurrences !== undefined ? updates.recurring.endOccurrences : row.endOccurrences;
    }

    const effectiveDueDate = updates.dueDate !== undefined ? updates.dueDate : row.dueDate;
    const effectiveStatus = updates.status !== undefined ? updates.status : row.status;
    const effectiveCompletedAt = updates.completedAt !== undefined ? updates.completedAt : row.completedAt;

    const groupId = row.groupId;

    const groupSql = `
      UPDATE todo_groups SET 
        title = ?, description = ?, isImportant = ?, priority = ?,
        recurringType = ?, recurringWeeklyDays = ?, recurringMonthlyDay = ?,
        recurringMonthlyNthWeek = ?, recurringMonthlyDayOfWeek = ?,
        recurringYearlyMonth = ?, recurringYearlyDay = ?,
        startDate = ?, endOption = ?, endDate = ?, endOccurrences = ?
      WHERE id = ?
    `;

    const groupParams = [
      effectiveTitle,
      effectiveDesc,
      effectiveImportant,
      effectivePriority,
      effRecType,
      effRecWeekly ? JSON.stringify(effRecWeekly) : null,
      effRecMonthDay,
      effRecMonthNth,
      effRecMonthDOW,
      effRecYearMonth,
      effRecYearDay,
      effStartDate,
      effEndOption,
      effEndDate,
      effEndOccurrences,
      groupId
    ];

    db.run(groupSql, groupParams, function (errGroup) {
      if (errGroup) return res.status(500).json({ error: errGroup.message });

      const todoSql = `
        UPDATE todos SET dueDate = ?, status = ?, completedAt = ? WHERE id = ?
      `;
      const todoParams = [effectiveDueDate, effectiveStatus, effectiveCompletedAt, id];

      db.run(todoSql, todoParams, async function (errTodo) {
        if (errTodo) return res.status(500).json({ error: errTodo.message });

        // Backend Task Spawning Logic 
        if (effectiveStatus === "DONE" && row.status !== "DONE" && effRecType !== "NONE") {
          try {
            // Check count condition
            if (effEndOption === "OCCURRENCES" && effEndOccurrences && row.occurrenceCount >= effEndOccurrences) {
              // Hit the limit, do not spawn
              return res.json({ message: "Updated", changes: this.changes });
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
              true // ignoreToday=true ensures we sequentially spawn missed past dates
            );

            if (nextDate) {
              // Check date condition
              if (effEndOption === "DATE" && effEndDate) {
                const { startOfDay } = await import("date-fns");
                if (nextDate.getTime() > startOfDay(new Date(effEndDate)).getTime()) {
                  // Hit the end date limit, do not spawn
                  return res.json({ message: "Updated", changes: this.changes });
                }
              }

              const { format } = await import("date-fns-tz");
              const nextDateStr = format(nextDate, "yyyy-MM-dd");

              db.get("SELECT id FROM todos WHERE groupId = ? AND dueDate = ?", [groupId, nextDateStr], (err, existing) => {
                if (existing) {
                  return res.json({ message: "Updated", changes: this.changes });
                }
                const spawnSql = `
                   INSERT INTO todos (id, groupId, dueDate, status, completedAt)
                   VALUES (?, ?, ?, 'TODO', NULL)
                 `;
                db.run(spawnSql, [uuidv4(), groupId, nextDateStr], (spawnErr) => {
                  if (spawnErr) console.error("Could not spawn next task event:", spawnErr.message);

                  // Increment occurrence count
                  db.run("UPDATE todo_groups SET occurrenceCount = occurrenceCount + 1 WHERE id = ?", [groupId], () => {
                    res.json({ message: "Updated", changes: this.changes });
                  });
                });
              });
              return; // We return early because the increment callback will fire res.json
            }
          } catch (e) {
            console.error("Error spanning next date:", e);
          }
        } else if (effectiveStatus === "TODO" && row.status === "DONE" && effRecType !== "NONE") {
          // Rollback: Delete any auto-spawned future tasks for this group
          const rollbackSql = `
            DELETE FROM todos 
            WHERE groupId = ? AND status = 'TODO' AND dueDate > ?
          `;
          db.run(rollbackSql, [groupId, row.dueDate], function(errRollback) {
             if (errRollback) console.error("Rollback error:", errRollback.message);
             if (this.changes > 0) {
               db.run("UPDATE todo_groups SET occurrenceCount = occurrenceCount - ? WHERE id = ?", [this.changes, groupId], () => {
                  res.json({ message: "Updated and rolled back", changes: this.changes });
               });
             } else {
               res.json({ message: "Updated", changes: this.changes });
             }
          });
          return;
        }

        res.json({ message: "Updated", changes: this.changes });
      });
    });
  });
});

// Complete Virtual Task (Skip intermediate)
router.post("/:id/complete-virtual", (req: Request, res: Response) => {
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

  db.get(fetchSql, [id], async (err, row: any) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Base task not found" });

    try {
      const { getNextOccurrence } = await import("../utils/recurringDate");
      const { format, startOfDay } = await import("date-fns");
      const { format: formatTz } = await import("date-fns-tz");
      
      const recConfig = {
        type: row.recurringType,
        weeklyDays: row.recurringWeeklyDays ? JSON.parse(row.recurringWeeklyDays) : null,
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
        return res.status(400).json({ error: "Target date is not a valid future occurrence." });
      }

      const allInserts = datesToInsert.map(d => ({
        date: d,
        status: (startOfDay(d).getTime() === startOfDay(targetDateObj).getTime()) ? "DONE" : "TODO",
      }));

      // Generate one more occurrence to act as the next pending task
      let spawnNext = false;
      const nextAfterTarget = getNextOccurrence(currentDate, recConfig, true);
      if (nextAfterTarget) {
        const nextMs = startOfDay(nextAfterTarget).getTime();
        let canSpawn = true;
        if (row.endOption === "DATE" && row.endDate) {
           if (nextMs > startOfDay(new Date(row.endDate)).getTime()) canSpawn = false;
        }
        if (row.endOption === "OCCURRENCES" && row.endOccurrences) {
           if (row.occurrenceCount + newInstances >= row.endOccurrences) canSpawn = false;
        }

        if (canSpawn) {
          allInserts.push({ date: nextAfterTarget, status: "TODO" });
          spawnNext = true;
        }
      }

      const insertSql = `INSERT INTO todos (id, groupId, dueDate, status, completedAt) VALUES (?, ?, ?, ?, ?)`;
      const stmt = db.prepare(insertSql);
      
      allInserts.forEach(item => {
        const newId = uuidv4();
        const isDone = item.status === "DONE";
        const completedStr = isDone ? new Date().toISOString() : null;
        stmt.run([newId, row.groupId, formatTz(item.date, "yyyy-MM-dd"), item.status, completedStr]);
      });
      stmt.finalize();

      const totalInstances = allInserts.length;
      db.run("UPDATE todo_groups SET occurrenceCount = occurrenceCount + ? WHERE id = ?", [totalInstances, row.groupId], () => {
        res.json({ message: "Successfully skipped and completed virtual task." });
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
