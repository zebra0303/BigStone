# BigStone Project - Research Summary

## 1. Overview

BigStone is a full-stack todo/task management application based on the philosophy of
"handle the BigStones (important tasks) first." Built as an npm workspace monorepo
with React frontend and Express backend, it supports recurring tasks, file attachments,
multi-language (ko/en), theming, and admin authentication.

## 2. Architecture

### Monorepo Structure

```
BigStone/
├── client/          # React 19 + TypeScript + Vite 7 + Tailwind CSS 3
├── server/          # Express 5 + TypeScript + better-sqlite3
├── .env             # Shared environment (PORT, VITE_PORT, VITE_API_URL)
├── package.json     # Workspace root (npm workspaces)
└── CLAUDE.md        # AI development guidelines
```

### Client - FSD (Feature-Sliced Design)

```
client/src/
├── app/             # App.tsx (QueryClient, Router, theme init), routing, global CSS
├── pages/           # HomePage (calendar view), SearchPage, AdminPage
├── features/        # todo/ (hooks, TodoCreate, TodoEditModal, TodoItem, TodoList, PrioritySelect)
├── entities/        # todo/model/ (types.ts, store.ts - Zustand persist)
├── shared/          # api/todoApi.ts, config/i18n.ts, lib/, locales/, ui/ components
└── widgets/         # (reserved for future)
```

### Server

```
server/src/
├── index.ts         # Express entry, CORS, static serving, route mounting
├── db/database.ts   # better-sqlite3 init, schema, WAL mode, foreign keys
├── routes/
│   ├── todos.ts     # CRUD + recurring spawning + virtual completion
│   ├── settings.ts  # Auth (bcrypt+JWT), language, config CRUD
│   └── attachments.ts  # File upload/download/delete (multer, 10MB limit)
└── utils/
    └── recurringDate.ts  # getNextValidDueDate(), getNextOccurrence(), safeParseDate()
```

## 3. Database Schema (SQLite - WAL mode)

### todo_groups

- id (TEXT PK, UUID v7), title, description, isImportant (legacy), priority (HIGH/MEDIUM/LOW)
- Recurring fields: recurringType, recurringWeeklyDays (JSON), recurringMonthlyDay,
  recurringMonthlyNthWeek, recurringMonthlyDayOfWeek, recurringYearlyMonth, recurringYearlyDay
- End conditions: startDate, endOption (NONE/DATE/OCCURRENCES), endDate, endOccurrences, occurrenceCount
- notificationMinutesBefore

### todos

- id (TEXT PK, UUID v7), groupId (FK CASCADE), dueDate (YYYY-MM-DD), status (TODO/DONE), completedAt

### system_settings

- key (TEXT PK), value (TEXT) - stores admin_password (bcrypt), language, theme settings

### todo_attachments

- id (TEXT PK, UUID v7), groupId (FK CASCADE), originalName, filename (UUID-based), size, createdAt

## 4. API Endpoints

| Method | Path                                | Auth | Description                                                           |
| ------ | ----------------------------------- | ---- | --------------------------------------------------------------------- |
| GET    | /api/todos                          | No   | Get all todos with groups & attachments (JSON aggregate)              |
| POST   | /api/todos                          | No   | Create todo + group (occurrenceCount=1)                               |
| PUT    | /api/todos/:id                      | No   | Update todo (triggers recurring spawn on DONE / rollback on revert)   |
| DELETE | /api/todos/:id                      | No   | Delete group (cascades to todos + attachments)                        |
| POST   | /api/todos/:id/complete-virtual     | No   | Skip intermediate & complete virtual recurring instance (transaction) |
| POST   | /api/todos/attachments/:groupId     | No   | Upload file (multer, 10MB limit)                                      |
| GET    | /api/todos/attachments/:id/download | No   | Download with original filename                                       |
| DELETE | /api/todos/attachments/:id          | No   | Delete attachment + file from disk                                    |
| GET    | /api/settings/status                | No   | Check if admin is setup                                               |
| POST   | /api/settings/setup                 | No   | Initial password setup (bcrypt 10 rounds)                             |
| POST   | /api/settings/login                 | No   | Login, returns JWT (24h expiry)                                       |
| GET    | /api/settings/config                | No   | Get public settings (language, etc.)                                  |
| PUT    | /api/settings/config                | JWT  | Update settings (admin only, upsert transaction)                      |
| GET    | /health                             | No   | Health check                                                          |

## 5. Key Business Logic

### Recurring Task System

1. **Creation**: POST creates one todo instance with `occurrenceCount = 1`
2. **Spawning** (PUT, status -> DONE): calculates next via `getNextOccurrence()`,
   checks end conditions, inserts new TODO, increments occurrenceCount
3. **Rollback** (PUT, DONE -> TODO): deletes future TODOs in group, decrements count
4. **Virtual Projection** (client-side): HomePage generates virtual instances for calendar,
   IDs formatted as `virtual-{realId}-{index}`, displayed with dashed border
5. **Virtual Completion** (POST complete-virtual): batch-inserts all intermediate instances
   in a transaction, marks target date as DONE

### Authentication

- bcrypt password hashing (10 rounds) -> JWT tokens (24h, `{role: "admin"}`)
- Client stores token in localStorage ("admin_token")
- ProtectedRoute redirects to /admin if no token
- Only PUT /api/settings/config requires JWT

### Theming System

- CSS variables: --primary, --primary-foreground, --font-family
- localStorage keys: theme, primary_color, font_family
- Dark mode: Tailwind "class" strategy on documentElement
- Brightness detection: `(r*299 + g*587 + b*114) / 1000 > 155` for foreground color
- Admin page: color picker, font selector (5 fonts), theme toggle
- Components use inline style `var(--primary)` for dynamic color

## 6. State Management

### Tanstack Query (Primary - server state)

- Query key: ["todos"], all mutations invalidate on success
- Hooks: useTodos, useCreateTodo, useUpdateTodoStatus, useDeleteTodo,
  useCompleteVirtualTodo, useUploadAttachment, useDeleteAttachment

### Zustand (Hybrid/Fallback - client state)

- Persisted to localStorage as "bigstone-todo-storage"
- Synced from Query data via useEffect in useTodos()
- Methods: addTodo, updateTodo, deleteTodo, toggleStatus

## 7. i18n

- Languages: Korean (ko, fallback), English (en)
- Detection: localStorage > navigator > server config sync
- 107 translation keys each (common, home, task, admin sections)
- Date formatting uses date-fns locale objects (ko, enUS)

## 8. Tech Stack

| Layer    | Technology                                 |
| -------- | ------------------------------------------ |
| Frontend | React 19, TypeScript 5.9, Vite 7.3         |
| Styling  | Tailwind CSS 3.4, lucide-react icons       |
| State    | Zustand 5 (persist), Tanstack Query 5      |
| Routing  | react-router-dom 7                         |
| i18n     | i18next 25, react-i18next 16               |
| Backend  | Express 5, TypeScript 5.9                  |
| Database | better-sqlite3 12 (WAL mode, foreign keys) |
| Auth     | bcrypt 6, jsonwebtoken 9                   |
| Upload   | multer 2 (diskStorage, UUID filenames)     |
| ID       | UUID v7 (time-sortable)                    |
| Dates    | date-fns 4, date-fns-tz 3                  |
| Testing  | Vitest 4, Testing Library                  |
| Linting  | ESLint 10, Prettier                        |

## 9. Development Commands

```bash
npm install            # Install all workspaces
npm run dev            # Start client + server concurrently
npm run build          # Build client (Vite) + server (tsc)
npm test               # Run client tests (Vitest)
npm run lint -w client # ESLint check
npx prettier --write . # Format all files
```

## 10. Environment (.env)

```
PORT=3300              # Server port
VITE_PORT=5050         # Client dev server port
VITE_API_URL=/api      # API base URL
```

## 11. Key File Paths

- DB init: `server/src/db/database.ts`
- API routes: `server/src/routes/{todos,settings,attachments}.ts`
- Recurring logic: `server/src/utils/recurringDate.ts` + `client/src/shared/lib/recurringDate.ts`
- Todo hooks: `client/src/features/todo/model/hooks.ts`
- API client: `client/src/shared/api/todoApi.ts`
- Types: `client/src/entities/todo/model/types.ts`
- Zustand store: `client/src/entities/todo/model/store.ts`
- Pages: `client/src/pages/{home,search,admin}/ui/*.tsx`
- i18n config: `client/src/shared/config/i18n.ts`
- Locale files: `client/src/shared/locales/{ko,en}.json`
- Theme init: `client/src/app/App.tsx`
- Tailwind config: `client/tailwind.config.js`
- Vite config: `client/vite.config.ts`
