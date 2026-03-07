# BigStone - Task Manager

**English** | [한국어](./README.ko.md)

> "Put the BigStones in first" — A task manager that prioritizes what matters most
> <img width="1080" height="301" alt="cover_1080" src="https://github.com/user-attachments/assets/b25c225e-002c-46c5-a2bc-ac7c200efba6" />

## Features

- **Priority Management** — 3-level priority (HIGH / MEDIUM / LOW) to tackle important tasks first
- **Recurring Tasks** — Daily / Weekly / Monthly / Yearly recurrence with end conditions (date, count)
- **Multiple View Modes** — 1-day / 3-day / Workweek / Full week calendar views
- **File Attachments** — Attach and download files per task (10MB limit)
- **Multi-language** — Korean / English support
- **Theme Customization** — Dark mode, primary color picker, web font selection
- **Admin Authentication** — bcrypt + JWT-based admin settings protection
- **Search** — Filter tasks by keyword and status

## Tech Stack

| Layer        | Technology                                   |
| ------------ | -------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite 7, Tailwind CSS 3 |
| State        | Zustand 5, TanStack Query 5                  |
| Backend      | Express 5, TypeScript, better-sqlite3        |
| Auth         | bcrypt, JSON Web Token                       |
| Architecture | FSD (Feature-Sliced Design), npm workspaces  |

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
```

## Commands

```bash
npm run dev            # Start dev server (client + server)
npm run build          # Production build
npm run start          # Run production
npm test               # Run tests
npm run lint -w client # ESLint check
```

## Project Structure

```
BigStone/
├── client/                    # React frontend
│   └── src/
│       ├── app/               # Global config, routing, theme initialization
│       ├── pages/             # HomePage, SearchPage, AdminPage
│       ├── features/          # Todo CRUD hooks and UI components
│       ├── entities/          # Todo type definitions and Zustand store
│       └── shared/            # API client, UI components, utilities, i18n
├── server/                    # Express backend
│   └── src/
│       ├── db/                # SQLite initialization and schema
│       ├── routes/            # REST API (todos, settings, attachments)
│       └── utils/             # Recurring date calculation logic
├── .env.example               # Environment variable template
├── CLAUDE.md                  # AI development guidelines
└── package.json               # Workspace root
```

## License

ISC
