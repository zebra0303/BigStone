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
    // Enable foreign key constraints for ON DELETE CASCADE to work
    db.run("PRAGMA foreign_keys = ON");

    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS todo_groups (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          isImportant BOOLEAN DEFAULT 0,
          recurringType TEXT DEFAULT 'NONE',
          recurringWeeklyDays TEXT,
          recurringMonthlyDay INTEGER,
          recurringMonthlyNthWeek INTEGER,
          recurringMonthlyDayOfWeek INTEGER,
          recurringYearlyMonth INTEGER,
          recurringYearlyDay INTEGER,
          notificationMinutesBefore INTEGER,
          startDate TEXT,
          endOption TEXT DEFAULT 'NONE',
          endDate TEXT,
          endOccurrences INTEGER,
          occurrenceCount INTEGER DEFAULT 0
        )
      `, (err) => {
        if (err) console.error("Could not create todo_groups table", err.message);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          groupId TEXT NOT NULL,
          dueDate TEXT NOT NULL,
          status TEXT DEFAULT 'TODO',
          completedAt TEXT,
          FOREIGN KEY (groupId) REFERENCES todo_groups(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error("Could not create todos table", err.message);
      });
    });
  }
});

export default db;
