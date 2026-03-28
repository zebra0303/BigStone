# BigStone - Task Manager

**English** | [한국어](./README.ko.md)

> "Put the BigStones in first" — A task manager that prioritizes what matters most
> <img width="1080" height="301" alt="cover_1080" src="https://github.com/user-attachments/assets/b25c225e-002c-46c5-a2bc-ac7c200efba6" />

## Features

- **Priority Management** — 3-level priority (HIGH / MEDIUM / LOW) with color-coded left border indicators
- **Recurring Tasks** — Daily / Weekly / Monthly / Yearly recurrence with end conditions (date, count)
- **Multiple View Modes** — 1-day / 3-day / Workweek / Full week calendar views (persisted per user)
- **Copy to Today** — Copy missed tasks to today as one-time tasks with a single click
- **Retrospective (KPT)** — Review past tasks with Keep/Problem/Try framework (7/14/30-day periods)
- **File Attachments** — Attach and download files per task (10MB limit)
- **Slack Notifications** — Scheduled Slack alerts for today's incomplete tasks via Incoming Webhook
- **PWA Support** — Installable app with offline caching, instant SW updates (skipWaiting + clientsClaim)
- **Multi-language** — Korean / English support with auto-detection
- **Theme Customization** — Dark mode, primary color picker, web font selection (DB-persisted)
- **Admin Authentication** — bcrypt + HttpOnly Cookie JWT (7-day expiry, auto-refresh) with account lockout (5 failures = 15 min lock)
- **Search** — Filter tasks by keyword and status

## Tech Stack

| Layer         | Technology                                                |
| ------------- | --------------------------------------------------------- |
| Frontend      | React 19, TypeScript, Vite 7, Tailwind CSS 3              |
| State         | Zustand 5, TanStack Query 5                               |
| Backend       | Express 5, TypeScript, better-sqlite3                     |
| Auth          | bcrypt, JWT, express-rate-limit                           |
| Notifications | node-cron, Slack Incoming Webhook                         |
| PWA           | vite-plugin-pwa, Workbox                                  |
| Security      | helmet, CORS, account lockout                             |
| Architecture  | FSD (Feature-Sliced Design), npm workspaces               |
| Shared Lib    | @zebra/core (common UI, utilities, types, error handling) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/zebra0303/BigStone.git
cd BigStone

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server (client + server concurrently)
npm run dev
```

After starting the dev server:

- Client: `http://localhost:5050` (or `VITE_PORT` in `.env`)
- Server API: `http://localhost:3300` (or `PORT` in `.env`)

### Environment Variables

```env
PORT=3300              # Server port
VITE_PORT=5050         # Client dev server port
VITE_API_URL=/api      # API base path
JWT_SECRET=...         # JWT signing secret (required in production)
CORS_ORIGIN=...        # Allowed CORS origins
```

### HTTPS via Cloudflare Tunnel (Optional)

For PWA installation and HTTPS access, set up a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
cloudflared tunnel --url http://localhost:<VITE_PORT>
```

## Commands

```bash
npm run dev            # Start dev server (client + server)
npm run build          # Production build
npm run start          # Run production
npm test               # Run tests (Vitest)
npm run lint -w client # ESLint check
npx prettier --write . # Format all files
```

## Project Structure

```
BigStone/
├── client/                    # React frontend
│   └── src/
│       ├── app/               # Global config, routing, theme initialization
│       ├── pages/             # HomePage, SearchPage, AdminPage, RetrospectivePage
│       ├── features/          # Todo CRUD hooks and UI components
│       ├── entities/          # Todo type definitions and Zustand store
│       └── shared/            # API client, UI components, utilities, i18n
├── server/                    # Express backend
│   └── src/
│       ├── db/                # SQLite initialization and schema
│       ├── routes/            # REST API (todos, settings, attachments, retrospectives)
│       ├── middleware/        # JWT authentication guard
│       ├── services/          # Slack notification scheduler (node-cron)
│       └── utils/             # Recurring date logic, Slack webhook
├── .env.example               # Environment variable template
├── CLAUDE.md                  # AI development guidelines
└── package.json               # Workspace root
```

## Security

- **Password**: bcrypt (10 rounds) hashing
- **Token**: HttpOnly Cookie JWT with 7-day expiry, auto-refresh on activity (1-day throttle)
- **Rate Limiting**: 10 login attempts per 15 minutes per IP
- **Account Lockout**: 5 consecutive failures locks the account for 15 minutes (DB-persisted, IP-independent)
- **Headers**: helmet for security headers (XSS, clickjacking protection)
- **CORS**: Origin whitelist validation
- **File Upload**: 10MB limit, UUID-based filenames, forced download headers
- **PWA Cache**: Auth endpoints excluded, GET-only caching, success-only responses

## License

ISC
