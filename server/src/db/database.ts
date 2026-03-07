import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(__dirname, "../../data/database.sqlite");
const dbDir = path.dirname(dbPath);

// Ensure that the directory for the database file exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Set WAL mode to improve concurrency with external tools like DBeaver
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
// Enable foreign key constraints for ON DELETE CASCADE to work
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS todo_groups (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    isImportant BOOLEAN DEFAULT 0,
    priority TEXT DEFAULT 'MEDIUM',
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
`);

// Attempt to add priority column if it doesn't exist (for existing DBs)
try {
  db.exec("ALTER TABLE todo_groups ADD COLUMN priority TEXT DEFAULT 'MEDIUM'");
} catch {
  // Ignore error if column already exists
}

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    status TEXT DEFAULT 'TODO',
    completedAt TEXT,
    FOREIGN KEY (groupId) REFERENCES todo_groups(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS todo_attachments (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    originalName TEXT NOT NULL,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (groupId) REFERENCES todo_groups(id) ON DELETE CASCADE
  )
`);

export default db;
