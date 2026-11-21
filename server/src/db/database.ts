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

// Add Slack notification columns independently so an existing column never skips the other
try {
  db.exec("ALTER TABLE todo_groups ADD COLUMN slackEnabled BOOLEAN DEFAULT 0");
} catch {
  // Ignore error if column already exists
}
try {
  db.exec("ALTER TABLE todo_groups ADD COLUMN slackNotificationTime TEXT");
} catch {
  // Ignore error if column already exists
}

// Add isPinned column for tasks that show at top of every day until completed
try {
  db.exec("ALTER TABLE todo_groups ADD COLUMN isPinned INTEGER DEFAULT 0");
} catch {
  // Ignore error if column already exists
}

// Add isCopied column to mark tasks created via copy-to-today
try {
  db.exec("ALTER TABLE todo_groups ADD COLUMN isCopied INTEGER DEFAULT 0");
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

db.exec(`
  CREATE TABLE IF NOT EXISTS retrospectives (
    id TEXT PRIMARY KEY,
    periodStart TEXT NOT NULL,
    periodEnd TEXT NOT NULL,
    keepText TEXT DEFAULT '',
    problemText TEXT DEFAULT '',
    tryText TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

// Indexes for common query/join patterns (eliminates O(N*M) scans on attachments and due dates)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_todos_group_id ON todos(groupId);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(dueDate);
  CREATE INDEX IF NOT EXISTS idx_todos_group_due ON todos(groupId, dueDate);
  CREATE INDEX IF NOT EXISTS idx_todo_attachments_group_id ON todo_attachments(groupId);
`);

export default db;
