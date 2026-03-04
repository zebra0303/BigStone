import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(__dirname, "../../data/database.sqlite");
const dbDir = path.dirname(dbPath);

// Ensure that the directory for the database file exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    // Set WAL mode to improve concurrency with external tools like DBeaver
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA busy_timeout = 5000");

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
          console.error(
            "Warning: Could not verify table schema (possibly locked by external tool)",
            err.message,
          );
        }
      },
    );
  }
});

export default db;
