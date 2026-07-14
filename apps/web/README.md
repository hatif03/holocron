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

- **Next.js 15** App Router with route groups `(marketing)` and `(app)`
- **React 19**
- **shadcn/ui** (Radix) — components in `src/components/ui/`
- **Tailwind CSS v4** — tweakcn theme tokens in `src/app/globals.css`
- **@xyflow/react** — research graph canvas
- **Zustand** — canvas state (`src/lib/canvas-store.ts`)
- **postgres** — direct SQL (no ORM)

Fonts: **Inter** (UI), **JetBrains Mono** (logs, code, BibTeX), and **Newsreader** (editorial home only) via `next/font/google`.

## Structure

```
src/
├── app/
│   ├── (marketing)/        Editorial home (no sidebar)
│   ├── (app)/              Product routes with sidebar shell
│   └── api/                REST endpoints
├── components/
│   ├── ui/                 shadcn components (button, card, dialog, sidebar, …)
│   ├── layout/             AppShell, PageHeader, marketing header
│   ├── research-graph/     Canvas, nodes, sidebar, MemoryPanel
│   ├── paper-generation/   Wizard, detail panels, ProcessLogPanel
│   └── memory/             MemoryView (profile + rich cards)
└── lib/                    db, agents-client, supermemory-client, memory-types
```

## API routes

| Route | Purpose |
|-------|---------|
| `/api/works` | CRUD research works + graph JSON |
| `/api/references` | Reference library CRUD, search, upload, analyze |
| `/api/generations` | Paper generation lifecycle + process log sync |
| `/api/generations/[genId]/memory` | Supermemory search hits for generation detail |
| `/api/works/[workId]/memory/search` | Hybrid memory search |
| `/api/works/[workId]/memory/profile` | Profile + search hits for MemoryView |
| `/api/settings/llm` | Proxy to agents LLM config |

## Theming

**Light mode is the default.** Dark mode is available via the theme toggle in the sidebar footer (product routes) or marketing header (home).

The UI uses a [tweakcn](https://tweakcn.com/) zinc-neutral palette with Holocron blue as primary. Product pages follow the Minimal UI Kit shell pattern (sidebar + page header + card lists). The marketing home uses an editorial layout with serif accents.

| Token | Use |
|-------|-----|
| `--background` / `--foreground` | Page surfaces and text |
| `--primary` | Actions, links, active nav |
| `--muted` / `--muted-foreground` | Secondary surfaces and text |
| `--sidebar-*` | App shell sidebar |
| `--success` / `--warning` / `--info` | Semantic badges |

Graph nodes keep semantic category colors (violet control, amber ideation, blue knowledge, emerald execution, orange evidence). React Flow background dots align to `--border` in both themes.

## Environment

Copy `.env.example` to the repo root. Web reads:

- `DATABASE_URL`
- `AGENTS_SERVICE_URL` / `NEXT_PUBLIC_AGENTS_URL`
- `STORAGE_PATH`

See [docs/CONFIGURATION.md](../../docs/CONFIGURATION.md) for the full list.
