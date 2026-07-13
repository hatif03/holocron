# Holocron Web

Next.js 15 frontend for [Holocron](../../README.md) — research graph editor, paper generation UI, references library, agent dashboard, and BYOK settings.

## Development

From the monorepo root:

```bash
npm install
docker compose -f docker/docker-compose.yml up --build
```

The web app runs at [http://localhost:3000](http://localhost:3000) inside the `web` Docker service with hot reload.

To run the web app alone (requires Postgres and agents separately):

```bash
npm run dev --workspace=web
```

## Stack

- **Next.js 15** App Router
- **React 19**
- **Tailwind CSS v4** — design tokens in `src/app/globals.css`
- **@xyflow/react** — research graph canvas
- **Zustand** — canvas state (`src/lib/canvas-store.ts`)
- **postgres** — direct SQL (no ORM)

Fonts: Orbitron (display), Exo 2 (body) via `next/font/google`.

## Structure

```
src/
├── app/                    Routes and API handlers
│   ├── api/                REST endpoints
│   ├── research-graph/     Graph list + canvas
│   ├── paper-generation/   Generation list + detail
│   ├── references/         Reference library
│   ├── agents/             Agent health page
│   └── settings/           BYOK LLM config
├── components/             UI primitives and feature components
│   ├── ui.tsx              Button, Input, Card, Dialog, etc.
│   ├── research-graph/     Canvas, nodes, sidebar, fields
│   └── paper-generation/   Wizard, detail panels
└── lib/                    db, agents-client, utils, canvas-store
```

## API routes

| Route | Purpose |
|-------|---------|
| `/api/works` | CRUD research works + graph JSON |
| `/api/references` | Reference library CRUD, search, upload, analyze |
| `/api/generations` | Paper generation lifecycle |
| `/api/settings/llm` | Proxy to agents LLM config |

## Theming

Dark mode is default. Tokens use the Holocron blend palette:

- **Crimson** (`--color-primary`) — actions and glow
- **Crawl yellow** (`--color-accent-yellow`) — display titles
- **Cyan** (`--color-accent-cyan`) — info and status

Toggle light/dark via the navbar theme switch.

## Environment

Copy `.env.example` to the repo root. Web reads:

- `DATABASE_URL`
- `AGENTS_SERVICE_URL` / `NEXT_PUBLIC_AGENTS_URL`
- `STORAGE_PATH`

See [docs/CONFIGURATION.md](../../docs/CONFIGURATION.md) for the full list.
