const db = require('better-sqlite3')('server/data/database.sqlite');
const rows = db.prepare(`
    SELECT 
      t.id, t.groupId, t.dueDate, t.status, t.completedAt,
      g.title, g.recurringType, g.recurringWeeklyDays, 
      g.startDate, g.endOption, g.endDate, g.endOccurrences, g.occurrenceCount
    FROM todos t
    JOIN todo_groups g ON t.groupId = g.id
`).all();
console.log(JSON.stringify(rows, null, 2));
