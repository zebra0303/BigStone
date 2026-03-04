import sqlite3 from "sqlite3";
import path from "path";

const dbPath = path.resolve(__dirname, "../../data/database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    // Create Todo table
    db.run(
      `
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        isImportant BOOLEAN DEFAULT 0,
        dueDate TEXT NOT NULL,
        status TEXT DEFAULT 'TODO',
        recurringType TEXT DEFAULT 'NONE',
        recurringWeeklyDays TEXT,
        recurringMonthlyDay INTEGER,
        recurringMonthlyNthWeek INTEGER,
        recurringMonthlyDayOfWeek INTEGER,
        recurringYearlyMonth INTEGER,
        recurringYearlyDay INTEGER,
        notificationMinutesBefore INTEGER,
        completedAt TEXT
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating table", err.message);
        }
      },
    );
  }
});

export default db;
