# BigStone Project - Research Summary

> **2026-11-21 Updates:**
>
> - Upgraded to **@zebra/core@0.2.0**: adopted `ApiClient` (`shared/api/client.ts`), root `<ToastContainer />` + `useToast` (`createToastStore`), `ErrorBoundary`, `resolveJwtSecret` (server), and `safeFetch` for Slack webhook SSRF protection.
> - Completed FSD boundary cleanup: moved `todoApi.ts` and `PriorityXi.tsx` into `entities/todo/`, introduced `widgets/page-header/ui/PageHeader.tsx`, and enforced Public API (`index.ts`) exports.
> - Hardened server security & ops: added per-request same-origin CORS delegate (`server/src/middleware/cors.ts`), removed unauthenticated `/uploads` static serving, added `server/eslint.config.mjs` and `.npmrc` (npm 12 Git dependency policy).
> - Expanded test coverage to **16 test files / 124 tests** (client 87 + server 37), including month-end `recurringDate` edge cases, `useProjectedTodos`, and `cors.test.ts`.

## 1. Overview

BigStone is a full-stack, PWA-enabled task management application built around the philosophy of handling "BigStones" (important tasks) first. Built as an npm workspace monorepo (React 19 + Express 5), it features a sophisticated recurring task system with calendar projections, secure cookie-based auth, Slack notifications, multi-language support (ko/en), KPT retrospectives, and account lockout protection.

## 2. Architecture

### Monorepo Structure

- `client/`: React 19 + TypeScript + Vite 7 + Tailwind CSS 3 (FSD Architecture)
- `server/`: Express 5 + TypeScript + better-sqlite3 + ESLint (`server/eslint.config.mjs`)
- `.npmrc`: Configures `allow-git=all` and `allow-scripts` for npm 12 compatibility with `@zebra/core` and native `better-sqlite3`/`bcrypt` builds.
- Workspace managed via root `package.json`.

### Client - FSD (Feature-Sliced Design)

The client architecture rigorously follows FSD. Slices communicate primarily via Public APIs (`index.ts` files).

- `app/`: Global providers, routing, `ErrorBoundary`, root `<ToastContainer />`, and CSS initialization.
- `pages/`: Full route components (Home, Admin, Search, Retrospective).
- `widgets/`: Composite UI blocks (`widgets/page-header/ui/PageHeader.tsx`).
- `features/`: User interaction and business logic (`features/todo/` CRUD hooks, projections, UI components, Public API `index.ts`).
- `entities/`: Domain schema, `entities/todo/api/todoApi.ts`, `entities/todo/ui/PriorityXi.tsx`, Zustand persist stores, Public API `index.ts`.
- `shared/`: `shared/api/client.ts` (`@zebra/core/client` `ApiClient` wrapper), toast store (`createToastStore`), reusable utils, config, and `@zebra/core` UI re-exports.

### Server

- **Database:** `better-sqlite3` in WAL mode. `todo_groups` holds the recurring configurations, while `todos` holds actual instances.
- **Security:** Helmet, rate limiting, cookie-parser, `resolveJwtSecret` (`@zebra/core/server`), and per-request same-origin CORS delegate (`server/src/middleware/cors.ts`). JWTs are sent as `HttpOnly` cookies. Public `/uploads` static serving has been removed in favor of authenticated attachment download routes.
- **Cron Jobs:** `notificationService.ts` checks every minute for upcoming tasks to notify via SSRF-protected Slack webhook (`safeFetch` from `@zebra/core/server`).

## 3. Key Business Logic

### Recurring Task System (Dual Layer)

1. **Virtual Projections (Client-Side):**
   - Managed by `useProjectedTodos`. Generates future instances of recurring tasks purely in memory so the calendar can display them infinitely without bloating the database. IDs look like `virtual-{id}-{index}`.
   - Requires robust date math (via `recurringDate.ts`) to handle daily, weekly, monthly (including nth-weekday and month-end clamping patterns), and yearly rules.
2. **Task Spawning (Server-Side):**
   - When a task's status changes to `DONE`, the server calculates the _next_ occurrence using `getNextOccurrence` and inserts it into the database.
   - Rollback (`DONE` -> `TODO`) deletes future instances.

### Authentication

- JWTs are generated on login/setup and sent via `Set-Cookie` headers (`resolveJwtSecret` enforces production secret configuration).
- The client `shared/api/client.ts` (`ApiClient`) uses `credentials: 'include'` to automatically attach the cookie.
- Rate limiting prevents brute force, and an account lockout mechanism (5 failures = 15 min lock) is enforced via the DB `system_settings` table.

### PWA and Caching

- `vite-plugin-pwa` registers a service worker (`autoUpdate` mode).
- Workbox handles `CacheFirst` for fonts and `NetworkFirst` for GET APIs.
- The `globPatterns` correctly cache HTML, CSS, and JS to ensure that the app completely updates without manual cache clearing when a new build is deployed.

## 4. State Management

- **Tanstack Query:** Primary server state. Uses an aggressive persistence layer (localStorage sync persister) to ensure offline availability.
- **Zustand:** Client-side UI state, toast notifications (`createToastStore`), and fallback logic.

## 5. Testing & CI

- **Vitest & React Testing Library** are used across the workspace: **16 test files / 124 tests** (client 87 + server 37).
- **ESLint**: Configured for both `client/` and `server/` (`server/eslint.config.mjs`).
- Husky runs `lint-staged` on pre-commit and tests on pre-push.
- Coverage highlights: month-end/leap-year `recurringDate` edge cases, `useProjectedTodos` deduplication, same-origin CORS delegate (`cors.test.ts`), and attachment/auth route guards.
