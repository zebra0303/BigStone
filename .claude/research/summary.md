# BigStone Project - Research Summary

> **2026-03-25 Updates:**
>
> - Refactored local error utilities to fully utilize standardized error boundaries and masked errors from **@zebra/core**.
> - Migrated core UI components (`Checkbox`, `Select`, `Button`, `Input`, etc.) to the shared **@zebra/core** library to maintain ecosystem consistency.

## 1. Overview

BigStone is a full-stack, PWA-enabled task management application built around the philosophy of handling "BigStones" (important tasks) first. Built as an npm workspace monorepo (React 19 + Express 5), it features a sophisticated recurring task system with calendar projections, secure cookie-based auth, Slack notifications, multi-language support (ko/en), KPT retrospectives, and account lockout protection.

## 2. Architecture

### Monorepo Structure

- `client/`: React 19 + TypeScript + Vite 7 + Tailwind CSS 3 (FSD Architecture)
- `server/`: Express 5 + TypeScript + better-sqlite3
- Workspace managed via root `package.json`.

### Client - FSD (Feature-Sliced Design)

The client architecture rigorously follows FSD. Slices communicate primarily via Public APIs (`index.ts` files).

- `app/`: Global providers, routing, and CSS initialization.
- `pages/`: Full route components (Home, Admin, Search, Retrospective).
- `features/`: User interaction and business logic (e.g., Todo creation, Todo edit, projections).
- `entities/`: Domain schema, types, and Zustand persist stores.
- `shared/`: Reusable utils, config, and `api/` clients (fetch-based). Note: Core UI elements are now pulled from `@zebra/core`.

### Server

- **Database:** `better-sqlite3` in WAL mode. `todo_groups` holds the recurring configurations, while `todos` holds actual instances.
- **Security:** Helmet, rate limiting, and cookie-parser. JWTs are sent as `HttpOnly` cookies.
- **Cron Jobs:** `notificationService.ts` checks every minute for upcoming tasks to notify via Slack.

## 3. Key Business Logic

### Recurring Task System (Dual Layer)

1. **Virtual Projections (Client-Side):**
   - Managed by `useProjectedTodos`. Generates future instances of recurring tasks purely in memory so the calendar can display them infinitely without bloating the database. IDs look like `virtual-{id}-{index}`.
   - Requires robust date math (via `recurringDate.ts`) to handle daily, weekly, monthly (including nth-weekday patterns), and yearly rules.
2. **Task Spawning (Server-Side):**
   - When a task's status changes to `DONE`, the server calculates the _next_ occurrence using `getNextOccurrence` and inserts it into the database.
   - Rollback (`DONE` -> `TODO`) deletes future instances.

### Authentication

- JWTs are generated on login/setup and sent via `Set-Cookie` headers.
- The client `todoApi.ts` uses `credentials: 'include'` to automatically attach the cookie.
- Rate limiting prevents brute force, and an account lockout mechanism (5 failures = 15 min lock) is enforced via the DB `system_settings` table.

### PWA and Caching

- `vite-plugin-pwa` registers a service worker (`autoUpdate` mode).
- Workbox handles `CacheFirst` for fonts and `NetworkFirst` for GET APIs.
- The `globPatterns` correctly cache HTML, CSS, and JS to ensure that the app completely updates without manual cache clearing when a new build is deployed.

## 4. State Management

- **Tanstack Query:** Primary server state. Uses an aggressive persistence layer (localStorage sync persister) to ensure offline availability.
- **Zustand:** Client-side UI state and fallback logic.

## 5. Testing & CI

- **Vitest & React Testing Library** are used across the workspace.
- Husky runs `lint-staged` on pre-commit and tests on pre-push.
- A critical focus remains on covering edge cases in date utilities and testing deduplication logic to ensure high structural integrity.
