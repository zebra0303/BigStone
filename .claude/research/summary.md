# BigStone Project - Research Summary

## 1. Overview

BigStone is a full-stack todo/task management application based on the philosophy of
"handle the BigStones (important tasks) first." Built as an npm workspace monorepo
with React frontend and Express backend, it supports recurring tasks, file attachments,
multi-language (ko/en), theming, Slack notifications, PWA offline support, and admin
authentication with account lockout protection.

## 2. Architecture

### Monorepo Structure

```
BigStone/
├── client/          # React 19 + TypeScript + Vite 7 + Tailwind CSS 3
├── server/          # Express 5 + TypeScript + better-sqlite3
├── .env             # Shared environment (PORT, VITE_PORT, VITE_API_URL, JWT_SECRET)
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
└── widgets/         # footer/
```

### Server

```
server/src/
├── index.ts         # Express entry, CORS, helmet, rate limit, route mounting
├── db/database.ts   # better-sqlite3 init, schema, WAL mode, foreign keys
├── routes/
│   ├── todos.ts     # CRUD + recurring spawning + virtual completion
│   ├── settings.ts  # Auth (bcrypt+JWT+lockout), language, config CRUD
│   └── attachments.ts  # File upload/download/delete (multer, 10MB limit)
├── middleware/
│   └── auth.ts      # requireAdmin - JWT verification
├── services/
│   └── notificationService.ts  # node-cron Slack notification scheduler
└── utils/
    ├── recurringDate.ts  # getNextOccurrence(), safeParseDate()
    └── slack.ts          # Slack webhook sender
```

## 3. Database Schema (SQLite - WAL mode)

### todo_groups

- id (TEXT PK, UUID v7), title, description, isImportant (legacy), priority (HIGH/MEDIUM/LOW)
- Recurring fields: recurringType, recurringWeeklyDays (JSON), recurringMonthlyDay,
  recurringMonthlyNthWeek, recurringMonthlyDayOfWeek, recurringYearlyMonth, recurringYearlyDay
- End conditions: startDate, endOption (NONE/DATE/OCCURRENCES), endDate, endOccurrences, occurrenceCount
- Notification: notificationMinutesBefore, slackEnabled, slackNotificationTime

### todos

- id (TEXT PK, UUID v7), groupId (FK CASCADE), dueDate (YYYY-MM-DD), status (TODO/DONE), completedAt

### system_settings

- key (TEXT PK), value (TEXT)
- Stored keys: admin_password (bcrypt), language, timezone, primary_color, font_family,
  theme, slack_webhook_url, login_failure_state (JSON: {count, lockedUntil})

### todo_attachments

- id (TEXT PK, UUID v7), groupId (FK CASCADE), originalName, filename (UUID-based), size, createdAt

## 4. API Endpoints

| Method | Path                                | Auth | Description                                                           |
| ------ | ----------------------------------- | ---- | --------------------------------------------------------------------- |
| GET    | /api/todos                          | No   | Get all todos with groups & attachments (JSON aggregate)              |
| POST   | /api/todos                          | Yes  | Create todo + group (occurrenceCount=1)                               |
| PUT    | /api/todos/:id                      | Yes  | Update todo (triggers recurring spawn on DONE / rollback on revert)   |
| DELETE | /api/todos/:id                      | Yes  | Delete group (cascades to todos + attachments)                        |
| POST   | /api/todos/:id/complete-virtual     | Yes  | Skip intermediate & complete virtual recurring instance (transaction) |
| POST   | /api/todos/attachments/:groupId     | Yes  | Upload file (multer, 10MB limit)                                      |
| GET    | /api/todos/attachments/:id/download | No   | Download with original filename                                       |
| DELETE | /api/todos/attachments/:id          | Yes  | Delete attachment + file from disk                                    |
| GET    | /api/settings/status                | No   | Check if admin is setup                                               |
| POST   | /api/settings/setup                 | No   | Initial password setup (bcrypt 10 rounds) [rate limited]              |
| POST   | /api/settings/login                 | No   | Login with lockout (5 fails = 15min lock) [rate limited]              |
| GET    | /api/settings/config                | No   | Get public settings (language, etc.)                                  |
| PUT    | /api/settings/config                | Yes  | Update settings (admin only, upsert transaction)                      |
| GET    | /health                             | No   | Health check                                                          |

## 5. Key Business Logic

### Recurring Task System

1. **Creation**: POST creates one todo instance with `occurrenceCount = 1`
2. **Spawning** (PUT, status -> DONE): calculates next via `getNextOccurrence()`,
   checks end conditions, inserts new TODO, increments occurrenceCount
3. **Rollback** (PUT, DONE -> TODO): deletes future TODOs in group, decrements count
4. **Virtual Projection** (client-side): HomePage generates virtual instances for calendar,
   IDs formatted as `virtual-{realId}-{index}`, displayed with reduced opacity
5. **Virtual Completion** (POST complete-virtual): batch-inserts all intermediate instances
   in a transaction, marks target date as DONE

### Authentication & Security

- bcrypt password hashing (10 rounds) -> JWT tokens (24h, `{role: "admin"}`)
- Client stores token in localStorage ("admin_token")
- ProtectedRoute redirects to /admin if no token
- **Per-IP Rate Limit**: 10 attempts per 15 minutes (express-rate-limit)
- **Account Lockout**: 5 consecutive failures = 15 minute lock (DB-persisted, IP-independent)
- Failure counter resets on successful login
- Helmet security headers, CORS whitelist

### Slack Notification System

- node-cron scheduler runs every minute
- Checks: slackEnabled=1, slackNotificationTime matches current time, dueDate = today, status != DONE
- Uses system timezone from admin settings (default: Asia/Seoul)
- Sends formatted messages via Slack Incoming Webhook

### Theming System

- CSS variables: --primary, --primary-foreground, --font-family
- localStorage keys: theme, primary_color, font_family
- Dark mode: Tailwind "class" strategy on documentElement
- Brightness detection: `(r*299 + g*587 + b*114) / 1000 > 155` for foreground color
- Admin page: color picker, font selector (5 fonts), theme toggle
- Components use inline style `var(--primary)` for dynamic color

### Priority Display

- Left border color indicator on todo items (3px)
- HIGH: red, MEDIUM: amber, LOW: green
- PriorityXi icon used only in priority selector dropdown

## 6. State Management

### Tanstack Query (Primary - server state)

- Query key: ["todos"], all mutations invalidate on success
- Hooks: useTodos, useCreateTodo, useUpdateTodoStatus, useDeleteTodo,
  useCompleteVirtualTodo, useUploadAttachment, useDeleteAttachment

### Zustand (Hybrid/Fallback - client state)

- Persisted to localStorage as "bigstone-todo-storage"
- Synced from Query data via useEffect in useTodos()

## 7. i18n

- Languages: Korean (ko, fallback), English (en)
- Detection: localStorage > navigator > server config sync
- 107 translation keys each (common, home, task, admin sections)
- Date formatting uses date-fns locale objects (ko, enUS)

## 8. PWA Support

- vite-plugin-pwa with autoUpdate registration
- Workbox runtime caching:
  - Google Fonts: CacheFirst (365 days)
  - API: NetworkFirst (5s timeout, 24h cache)
- Standalone display mode with app manifest

## 9. Tech Stack

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
| Security | helmet, express-rate-limit, CORS           |
| Notify   | node-cron, axios (Slack webhook)           |
| ID       | UUID v7 (time-sortable)                    |
| Dates    | date-fns 4, date-fns-tz 3                  |
| PWA      | vite-plugin-pwa 1.2 (Workbox)             |
| Testing  | Vitest 4, Testing Library                  |
| Linting  | ESLint 10, Prettier                        |

## 10. Development Commands

```bash
npm install            # Install all workspaces
npm run dev            # Start client + server concurrently
npm run build          # Build client (Vite) + server (tsc)
npm test               # Run client tests (Vitest)
npm run lint -w client # ESLint check
npx prettier --write . # Format all files
```

## 11. Environment (.env)

```
PORT=3300              # Server port
VITE_PORT=5050         # Client dev server port
VITE_API_URL=/api      # API base URL
JWT_SECRET=...         # JWT signing secret (auto-generated fallback in dev)
CORS_ORIGIN=...        # Allowed CORS origins
```

## 12. Key File Paths

- DB init: `server/src/db/database.ts`
- API routes: `server/src/routes/{todos,settings,attachments}.ts`
- Auth middleware: `server/src/middleware/auth.ts`
- Notification service: `server/src/services/notificationService.ts`
- Slack utility: `server/src/utils/slack.ts`
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

## 13. View Mode Persistence

- User's preferred calendar view (1DAY/3DAY/WEEK_WORK/WEEK_ALL) saved to localStorage
- Key: `bigstone-view-mode`, restored on page load
