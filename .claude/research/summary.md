# BigStone Project - Research Summary

> **2026-03-22 Architecture Update:** Core UI components (Button, Card, Input, Textarea, Badge, ConfirmModal) and common API types have been extracted from this repository into the `@zebra/core` (`zCore` repo) shared library. These are now imported directly via `package.json` (`github:zebra0303/zCore#main`) to maintain DRY principles across the BigStone, zlog, and zGo ecosystem.

## 1. Overview

BigStone is a full-stack todo/task management application based on the philosophy of
"handle the BigStones (important tasks) first." Built as an npm workspace monorepo
with React frontend and Express backend, it supports recurring tasks, file attachments,
multi-language (ko/en), theming, Slack notifications, PWA offline support, KPT retrospectives,
and admin authentication with account lockout protection.

## 2. Architecture

### Monorepo Structure

```
BigStone/
├── client/              # React 19 + TypeScript + Vite 7 + Tailwind CSS 3
├── server/              # Express 5 + TypeScript + better-sqlite3
├── .env                 # Shared environment (PORT, VITE_PORT, VITE_API_URL, JWT_SECRET, CORS_ORIGIN)
├── .env.example         # Template for environment variables
├── .husky/              # Git hooks (pre-commit: lint-staged, pre-push: coverage)
├── package.json         # Workspace root (npm workspaces)
├── CLAUDE.md            # AI development guidelines
├── README.md            # English documentation
└── README.ko.md         # Korean documentation
```

### Client - FSD (Feature-Sliced Design)

```
client/src/
├── main.tsx                              # Entry point, PWA registration (16 lines)
├── app/
│   ├── App.tsx                           # QueryClient, Router, theme/settings init (120 lines)
│   ├── routers/
│   │   ├── appRouter.tsx                 # Route definitions: /, /search, /retrospective, /admin (37 lines)
│   │   └── ProtectedRoute.tsx            # Token-based auth guard (9 lines)
│   └── styles/
│       └── global.css                    # Tailwind directives, CSS variables
├── pages/
│   ├── home/ui/HomePage.tsx              # Calendar view, virtual projections, multi-view (492 lines)
│   ├── admin/ui/AdminPage.tsx            # Auth (setup/login) + settings management (456 lines)
│   ├── search/ui/SearchPage.tsx          # Keyword/status search with deduplication (169 lines)
│   └── retrospective/ui/RetrospectivePage.tsx  # KPT review with task summaries (438 lines)
├── features/
│   └── todo/
│       ├── model/
│       │   └── hooks.ts                  # React Query hooks, token refresh (137 lines)
│       └── ui/
│           ├── TodoCreate.tsx            # Create modal with recurring config (626 lines)
│           ├── TodoEditModal.tsx          # Edit modal with file management (644 lines)
│           ├── TodoItem.tsx              # Single todo rendering, copy-to-today (242 lines)
│           ├── TodoList.tsx              # List container with empty state (30 lines)
│           └── PrioritySelect.tsx        # Priority dropdown with PriorityXi icon (92 lines)
├── entities/
│   └── todo/
│       └── model/
│           ├── types.ts                  # Todo, RecurringConfig, Attachment types (58 lines)
│           └── store.ts                  # Zustand persist store (49 lines)
├── shared/
│   ├── api/
│   │   ├── todoApi.ts                    # fetch-based CRUD client (102 lines)
│   │   └── retrospectiveApi.ts           # Retrospective API client (95 lines)
│   ├── config/
│   │   └── i18n.ts                       # i18next setup, language sync (40 lines)
│   ├── lib/
│   │   ├── recurringDate.ts              # Client-side date calculation (137 lines)
│   │   ├── linkify.tsx                   # URL auto-linking component (34 lines)
│   │   ├── localeUtils.ts               # date-fns locale resolver (9 lines)
│   │   └── utils.ts                      # cn() Tailwind merge helper (7 lines)
│   ├── locales/
│   │   ├── ko.json                       # Korean translations (~110 keys)
│   │   └── en.json                       # English translations (~110 keys)
│   └── ui/
│       ├── Button.tsx                    # 5 variants, 5 sizes (41 lines)
│       ├── Input.tsx                     # Text input with dark mode (22 lines)
│       ├── Select.tsx                    # Native select with custom arrow (27 lines)
│       ├── Textarea.tsx                  # Resizable textarea (21 lines)
│       ├── Card.tsx                      # Card, CardHeader, CardTitle, CardContent (50 lines)
│       ├── Badge.tsx                     # 4 variants (32 lines)
│       ├── Checkbox.tsx                  # Custom styled with Check icon (29 lines)
│       ├── Toast.tsx                     # Auto-dismiss notification (37 lines)
│       ├── ConfirmModal.tsx              # 3 variants: danger/warning/info (84 lines)
│       └── PriorityXi.tsx               # BigXi mascot with priority color (70 lines)
└── widgets/
    └── footer/ui/Footer.tsx              # GitHub link with BigXi icon (24 lines)
```

**Total client code: ~4,550 lines**

### Server

```
server/src/
├── index.ts                              # Express entry, middleware chain (89 lines)
├── db/
│   └── database.ts                       # Schema init, WAL mode, migrations (103 lines)
├── routes/
│   ├── todos.ts                          # CRUD + recurring spawn + virtual completion (609 lines)
│   ├── settings.ts                       # Auth + config + lockout + token refresh (225 lines)
│   ├── attachments.ts                    # File upload/download/delete (136 lines)
│   └── retrospectives.ts                # KPT CRUD + task summary (130 lines)
├── middleware/
│   └── auth.ts                           # requireAdmin JWT verification (35 lines)
├── services/
│   └── notificationService.ts            # Cron Slack scheduler (96 lines)
└── utils/
    ├── recurringDate.ts                  # getNextOccurrence(), getNextValidDueDate() (153 lines)
    └── slack.ts                          # Webhook sender (45 lines)
```

**Total server code: ~1,620 lines**

## 3. Database Schema (SQLite - WAL mode)

### todo_groups

| Column                    | Type                  | Description                              |
| ------------------------- | --------------------- | ---------------------------------------- |
| id                        | TEXT PK               | UUID v7                                  |
| title                     | TEXT NOT NULL         | Task title                               |
| description               | TEXT                  | Optional description                     |
| isImportant               | INTEGER DEFAULT 0     | Legacy flag (use priority instead)       |
| priority                  | TEXT DEFAULT 'MEDIUM' | HIGH / MEDIUM / LOW                      |
| recurringType             | TEXT DEFAULT 'NONE'   | NONE / DAILY / WEEKLY / MONTHLY / YEARLY |
| recurringWeeklyDays       | TEXT                  | JSON array of weekday numbers [0-6]      |
| recurringMonthlyDay       | INTEGER               | Day of month (1-31)                      |
| recurringMonthlyNthWeek   | INTEGER               | Nth week (1-5, 5=last)                   |
| recurringMonthlyDayOfWeek | INTEGER               | Day of week for nth pattern (0-6)        |
| recurringYearlyMonth      | INTEGER               | Month (1-12)                             |
| recurringYearlyDay        | INTEGER               | Day (1-31)                               |
| notificationMinutesBefore | INTEGER               | Minutes before due                       |
| slackEnabled              | INTEGER DEFAULT 0     | Slack notification toggle                |
| slackNotificationTime     | TEXT                  | HH:mm format                             |
| startDate                 | TEXT                  | Recurrence start date                    |
| endOption                 | TEXT DEFAULT 'NONE'   | NONE / DATE / OCCURRENCES                |
| endDate                   | TEXT                  | End date for recurrence                  |
| endOccurrences            | INTEGER               | Max occurrence count                     |
| occurrenceCount           | INTEGER DEFAULT 1     | Current count                            |

### todos

| Column      | Type                | Description                        |
| ----------- | ------------------- | ---------------------------------- |
| id          | TEXT PK             | UUID v7                            |
| groupId     | TEXT FK             | References todo_groups(id) CASCADE |
| dueDate     | TEXT NOT NULL       | YYYY-MM-DD format                  |
| status      | TEXT DEFAULT 'TODO' | TODO / DONE                        |
| completedAt | TEXT                | ISO timestamp                      |

### system_settings

| Column | Type    | Description        |
| ------ | ------- | ------------------ |
| key    | TEXT PK | Setting identifier |
| value  | TEXT    | Setting value      |

**Stored keys:** admin_password (bcrypt hash), language (ko/en), timezone (IANA),
primary_color (hex), font_family (CSS), theme (light/dark), slack_webhook_url,
login_failure_state (JSON: {count, lockedUntil})

**Internal keys** (filtered from public API): admin_password, login_failure_state

### todo_attachments

| Column       | Type    | Description                        |
| ------------ | ------- | ---------------------------------- |
| id           | TEXT PK | UUID v7                            |
| groupId      | TEXT FK | References todo_groups(id) CASCADE |
| originalName | TEXT    | User's filename                    |
| filename     | TEXT    | UUID-based stored filename         |
| size         | INTEGER | File size in bytes                 |
| createdAt    | TEXT    | ISO timestamp                      |

### retrospectives

| Column      | Type            | Description     |
| ----------- | --------------- | --------------- |
| id          | TEXT PK         | UUID v7         |
| periodStart | TEXT NOT NULL   | YYYY-MM-DD      |
| periodEnd   | TEXT NOT NULL   | YYYY-MM-DD      |
| keepText    | TEXT DEFAULT '' | Keep section    |
| problemText | TEXT DEFAULT '' | Problem section |
| tryText     | TEXT DEFAULT '' | Try section     |
| createdAt   | TEXT NOT NULL   | ISO timestamp   |
| updatedAt   | TEXT NOT NULL   | ISO timestamp   |

## 4. API Endpoints

### Todos

| Method | Path                            | Auth | Description                                               |
| ------ | ------------------------------- | ---- | --------------------------------------------------------- |
| GET    | /api/todos                      | No   | All todos with groups & attachments (JSON aggregate JOIN) |
| POST   | /api/todos                      | Yes  | Create todo + group (occurrenceCount=1)                   |
| PUT    | /api/todos/:id                  | Yes  | Update todo; spawns next on DONE, rollback on revert      |
| DELETE | /api/todos/:id                  | Yes  | Delete group (cascades todos + attachments)               |
| POST   | /api/todos/:id/complete-virtual | Yes  | Batch-insert intermediates, mark target DONE              |
| POST   | /api/todos/:id/copy-to-today    | Yes  | Copy as one-time task for today (timezone-aware)          |

### Attachments

| Method | Path                                | Auth | Description                             |
| ------ | ----------------------------------- | ---- | --------------------------------------- |
| POST   | /api/todos/attachments/:groupId     | Yes  | Upload file (multer, 10MB, UUID rename) |
| GET    | /api/todos/attachments/:id/download | No   | Download with original filename         |
| DELETE | /api/todos/attachments/:id          | Yes  | Delete file + DB record                 |

### Settings & Auth

| Method | Path                  | Auth | Description                                              |
| ------ | --------------------- | ---- | -------------------------------------------------------- |
| GET    | /api/settings/status  | No   | Check if admin password is set                           |
| POST   | /api/settings/setup   | No   | Initial password setup (bcrypt 10 rounds) [rate limited] |
| POST   | /api/settings/login   | No   | Login with lockout [rate limited]                        |
| POST   | /api/settings/refresh | Yes  | Renew JWT token (7-day expiry)                           |
| GET    | /api/settings/config  | No   | Get public settings (excludes internal keys)             |
| PUT    | /api/settings/config  | Yes  | Upsert settings (transaction)                            |

### Retrospectives

| Method | Path                              | Auth | Description                                |
| ------ | --------------------------------- | ---- | ------------------------------------------ |
| GET    | /api/retrospectives               | No   | All retrospectives (newest first)          |
| GET    | /api/retrospectives/:id           | No   | Single retrospective                       |
| GET    | /api/retrospectives/summary/tasks | No   | Task summary for date range (?start=&end=) |
| POST   | /api/retrospectives               | Yes  | Create KPT retrospective                   |
| PUT    | /api/retrospectives/:id           | Yes  | Update KPT text fields                     |
| DELETE | /api/retrospectives/:id           | Yes  | Delete retrospective                       |

### Other

| Method | Path    | Auth | Description  |
| ------ | ------- | ---- | ------------ |
| GET    | /health | No   | Health check |

## 5. Key Business Logic

### Recurring Task System

1. **Creation**: POST creates one todo instance with `occurrenceCount = 1`.
   Client calls `getNextValidDueDate()` to ensure initial date matches recurring pattern.

2. **Spawning** (PUT, status → DONE, todos.ts:303-365):
   - Calculates next via `getNextOccurrence()`
   - Checks end conditions: occurrence limit or end date
   - Inserts new TODO instance if not duplicate
   - Increments occurrenceCount

3. **Rollback** (PUT, DONE → TODO, todos.ts:368-387):
   - Deletes all future TODO instances for this group
   - Decrements occurrenceCount by deleted count

4. **Virtual Projection** (client-side, HomePage.tsx:74-182):
   - Generates virtual instances for calendar display
   - IDs formatted as `virtual-{realId}-{index}`
   - Displayed with reduced opacity (opacity-70)
   - Caps at 1000 iterations per task (~3 years for daily)
   - Respects end conditions (date/occurrences)
   - Uses `existingDatesPerGroup` map to avoid duplicates within same groupId

5. **Virtual Completion** (POST complete-virtual, todos.ts:397-524):
   - Batch-inserts all intermediate instances in transaction
   - Marks target date as DONE, intervening dates as TODO
   - Updates occurrenceCount by total instances created

6. **Copy to Today** (POST copy-to-today, todos.ts:527-583):
   - Creates non-recurring copy (recurringType='NONE')
   - Uses admin timezone from DB for correct "today" date
   - Returns new todoId and groupId

### Virtual Task ID Parsing

```
Format:    virtual-{baseUUID}-{projectionIndex}
Extract:   id.replace(/^virtual-/, '').replace(/-\d+$/, '')
```

Used in TodoItem.tsx for toggle, edit, delete, and copy operations.

### Authentication & Security

- **Password**: bcrypt hashing (10 rounds) → JWT tokens (7-day expiry, `{role: "admin"}`)
- **Token Storage**: localStorage key `admin_token`
- **Token Refresh**: Auto-refresh on admin page visit + todo completion (1-day throttle via `admin_token_refreshed_at`)
- **ProtectedRoute**: Client-side redirect to /admin if no token
- **Rate Limit**: 10 attempts per 15 minutes per IP (auth endpoints), 100/min global
- **Account Lockout**: 5 consecutive failures = 15 minute lock (DB-persisted in system_settings)
- **Security Headers**: helmet (XSS, clickjacking protection)
- **CORS**: Origin whitelist from CORS_ORIGIN env var
- **File Upload**: 10MB limit, UUID filenames, forced download headers (XSS prevention)
- **Internal Keys**: admin_password and login_failure_state filtered from public config API

### Slack Notification System

- node-cron scheduler runs every minute (notificationService.ts)
- Checks: slackEnabled=1, slackNotificationTime matches current HH:mm, dueDate = today, status != DONE
- Uses system timezone from admin settings (default: Asia/Seoul)
- Sends formatted Slack block messages with priority emoji and Korean priority text
- Webhook URL stored in system_settings

### Theming System

- **CSS Variables**: `--primary`, `--primary-foreground`, `--font-family`
- **Dual persistence**: localStorage (fast init, no flash) + DB (source of truth, survives cache clear)
- **Init flow** (App.tsx): Quick apply from localStorage → fetch from server → override if different
- **Dark mode**: Tailwind `class` strategy on `<html>` element
- **Brightness detection**: `(r*299 + g*587 + b*114) / 1000 > 155` → white/black foreground
- **Meta theme-color**: Updated dynamically based on light/dark mode
- **Admin settings**: color picker, 5 font options, light/dark toggle, 8 timezone presets

### Priority System

- Three levels: HIGH (red-500), MEDIUM (amber-400), LOW (emerald-500)
- Left border color indicator (3px) on TodoItem
- PriorityXi mascot icon with priority-colored bowtie in dropdown
- Legacy `isImportant` field → falls back to HIGH priority

### Search System (SearchPage.tsx)

- Case-insensitive keyword match on title and description
- Status filter: ALL / TODO / DONE
- **Deduplication**: Groups by groupId, keeps earliest due date instance per recurring series
- Sorting: Important first, then by dueDate ascending

## 6. State Management

### Tanstack Query (Primary - server state)

- **QueryClient config**: staleTime 5min, gcTime 24hr, retry 1, refetchOnWindowFocus false
- **Persistence**: `PersistQueryClientProvider` with localStorage via `createSyncStoragePersister`
- **Query key**: `["todos"]` — all mutations invalidate on success
- **Hooks**: useTodos, useCreateTodo, useUpdateTodoStatus, useDeleteTodo,
  useCompleteVirtualTodo, useCopyToToday, useUploadAttachment, useDeleteAttachment

### Zustand (Hybrid/Fallback - client state)

- Persisted to localStorage as `bigstone-todo-storage`
- Synced from Query data via useEffect in `useTodos()` hook
- Actions: addTodo, updateTodo, deleteTodo, toggleStatus

### localStorage Keys

| Key                      | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| admin_token              | JWT authentication token                          |
| admin_token_refreshed_at | Token refresh throttle timestamp                  |
| theme                    | light / dark                                      |
| primary_color            | Hex color string                                  |
| font_family              | CSS font-family value                             |
| bigstone-view-mode       | Calendar view: 1DAY / 3DAY / WEEK_WORK / WEEK_ALL |
| bigstone-todo-storage    | Zustand persisted store                           |
| i18nextLng               | Language preference                               |

## 7. i18n

- **Languages**: Korean (ko, fallback), English (en)
- **Detection order**: localStorage → navigator → server config sync
- **Translation sections**: common, home, task, admin, retro (~110 keys each)
- **Date formatting**: date-fns locale objects (ko, enUS) via `getDateLocale()`
- **Server sync**: `syncLanguageWithServer()` in App.tsx compares i18n.language with server config

## 8. PWA Support

- **Plugin**: vite-plugin-pwa 1.2 with autoUpdate registration
- **Service Worker**: skipWaiting + clientsClaim for immediate updates
- **Manifest**: standalone display, BigStone name, blue theme (#3b82f6)
- **Icons**: 192x192 + 512x512 (including maskable)
- **Workbox runtime caching**:
  - Google Fonts: CacheFirst (365 days, 10 entries)
  - Auth endpoints (login/setup/refresh): NetworkOnly (never cached)
  - API GET requests: NetworkFirst (5s timeout, 24hr max age, 50 entries, success-only)

## 9. Tech Stack

| Layer     | Technology                       | Version      |
| --------- | -------------------------------- | ------------ |
| Frontend  | React, TypeScript, Vite          | 19, 5.9, 7.3 |
| Styling   | Tailwind CSS, lucide-react       | 3.4, 0.577   |
| State     | Zustand, Tanstack Query          | 5, 5.90      |
| Routing   | react-router-dom                 | 7            |
| i18n      | i18next, react-i18next           | 25, 16       |
| Backend   | Express, TypeScript              | 5.2, 5.9     |
| Database  | better-sqlite3 (WAL, FK)         | 12           |
| Auth      | bcrypt, jsonwebtoken             | 6, 9         |
| Upload    | multer (diskStorage, UUID)       | 2            |
| Security  | helmet, express-rate-limit, CORS | 8, 8, 2.8    |
| Notify    | node-cron, axios (Slack)         | 4, 1.13      |
| ID        | UUID v7 (time-sortable)          | 13           |
| Dates     | date-fns, date-fns-tz            | 4, 3         |
| PWA       | vite-plugin-pwa (Workbox)        | 1.2          |
| Testing   | Vitest, Testing Library          | 4, 16        |
| Linting   | ESLint, Prettier, lint-staged    | 10, 3.8, 16  |
| Git Hooks | Husky                            | 9.1          |

## 10. Build & Development

### NPM Scripts (Root)

| Script          | Command                                  |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start client + server concurrently       |
| `npm run build` | Build client (tsc + Vite) + server (tsc) |
| `npm test`      | Run client + server tests (Vitest)       |
| `npm start`     | Production: server + client preview      |

### NPM Scripts (Client)

| Script                            | Command                 |
| --------------------------------- | ----------------------- |
| `npm run dev -w client`           | Vite dev server         |
| `npm run build -w client`         | tsc -b && vite build    |
| `npm run lint -w client`          | ESLint check            |
| `npm run test:coverage -w client` | Vitest with v8 coverage |

### NPM Scripts (Server)

| Script                            | Command                 |
| --------------------------------- | ----------------------- |
| `npm run dev -w server`           | nodemon + ts-node       |
| `npm run build -w server`         | tsc                     |
| `npm run test:coverage -w server` | Vitest with v8 coverage |

### Git Hooks (Husky)

| Hook       | Action                                                  |
| ---------- | ------------------------------------------------------- |
| pre-commit | lint-staged: ESLint + Prettier check on staged files    |
| pre-push   | Run test:coverage for both client and server workspaces |

### Code Splitting (Vite)

| Chunk  | Contents                                    | Limit   |
| ------ | ------------------------------------------- | ------- |
| vendor | react, react-dom, react-router-dom, zustand | < 500kB |
| query  | @tanstack/react-query                       | < 500kB |
| ui     | lucide-react                                | < 500kB |
| i18n   | i18next, react-i18next                      | < 500kB |

## 11. Environment Variables (.env)

| Variable     | Default                      | Description                     |
| ------------ | ---------------------------- | ------------------------------- |
| PORT         | 3300 (prod), 3001 (dev)      | Express server port             |
| VITE_PORT    | 5050 (prod), 3000 (dev)      | Vite dev/preview port           |
| VITE_API_URL | /api                         | API base URL                    |
| JWT_SECRET   | dev_only_secret (warns)      | JWT signing secret              |
| CORS_ORIGIN  | http://localhost:{VITE_PORT} | Comma-separated allowed origins |

## 12. Key File Paths

### Server

- Entry: `server/src/index.ts`
- DB schema: `server/src/db/database.ts`
- Routes: `server/src/routes/{todos,settings,attachments,retrospectives}.ts`
- Auth middleware: `server/src/middleware/auth.ts`
- Notification cron: `server/src/services/notificationService.ts`
- Recurring logic: `server/src/utils/recurringDate.ts`
- Slack webhook: `server/src/utils/slack.ts`
- Tests: `server/src/{utils,middleware}/__tests__/*.test.ts`

### Client

- Entry: `client/src/main.tsx`
- App setup: `client/src/app/App.tsx`
- Routes: `client/src/app/routers/appRouter.tsx`
- Pages: `client/src/pages/{home,admin,search,retrospective}/ui/*.tsx`
- Todo hooks: `client/src/features/todo/model/hooks.ts`
- Todo UI: `client/src/features/todo/ui/{TodoItem,TodoCreate,TodoEditModal,TodoList}.tsx`
- Types: `client/src/entities/todo/model/types.ts`
- Zustand store: `client/src/entities/todo/model/store.ts`
- API clients: `client/src/shared/api/{todoApi,retrospectiveApi}.ts`
- Recurring logic: `client/src/shared/lib/recurringDate.ts`
- i18n config: `client/src/shared/config/i18n.ts`
- Locales: `client/src/shared/locales/{ko,en}.json`
- UI components: `client/src/shared/ui/*.tsx`
- Tests: `client/src/{shared,features}/*/__tests__/*.test.{ts,tsx}`

### Config

- Vite: `client/vite.config.ts`
- Vitest (client): `client/vitest.config.ts`
- Vitest (server): `server/vitest.config.ts`
- Tailwind: `client/tailwind.config.js`
- ESLint: `client/eslint.config.js`
- TypeScript (client): `client/tsconfig.app.json` (paths: @/_ → ./src/_)
- TypeScript (server): `server/tsconfig.json` (target: es2020, module: commonjs)

## 13. Architectural Patterns

1. **Task Spawning**: DONE triggers next occurrence creation with end-condition checks
2. **Effective Values**: PUT preserves old values if not provided in request body
3. **Transactions**: Batch operations use `db.transaction()` (virtual completion, settings upsert)
4. **Cascading Deletes**: FK constraints with ON DELETE CASCADE for data consistency
5. **Dual-Layer Settings**: localStorage for fast init + DB as source of truth
6. **Token Refresh Throttle**: 1-day interval check before refresh to avoid excessive requests
7. **Virtual Projections**: Client generates display-only instances without DB records
8. **Search Deduplication**: Groups recurring series by groupId, shows earliest instance
9. **Timezone-Aware Dates**: All dates stored as YYYY-MM-DD local; server uses admin timezone for "today"

## 14. Test Infrastructure

### Client Tests (34 tests)

| File                  | Tests | Coverage Target                      |
| --------------------- | ----- | ------------------------------------ |
| linkify.test.tsx      | 7     | URL detection, multi-URL, edge cases |
| Toast.test.tsx        | 4     | Render, auto-close, icon, duration   |
| localeUtils.test.ts   | 4     | ko/en locale resolution              |
| recurringDate.test.ts | 15    | All recurring types + edge cases     |
| utils.test.ts         | 3     | cn() class merging                   |
| TodoItem.test.tsx     | 1     | Basic render                         |

### Server Tests (29 tests)

| File                  | Tests | Coverage Target                                 |
| --------------------- | ----- | ----------------------------------------------- |
| auth.test.ts          | 6     | No token, invalid, expired, valid, wrong secret |
| recurringDate.test.ts | 23    | DAILY, WEEKLY, MONTHLY, YEARLY + edge cases     |

### Coverage Highlights

| File                      | Stmts | Branch | Lines |
| ------------------------- | ----- | ------ | ----- |
| auth.ts                   | 100%  | 87.5%  | 100%  |
| recurringDate.ts (server) | 86%   | 75%    | 85%   |
