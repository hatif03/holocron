# Holocron architecture

Holocron is an npm workspaces monorepo. A Next.js web app provides the UI and persistence layer; a Python FastAPI service runs the multi-agent AI pipeline; Docker Compose bundles Postgres, LaTeX compilation, and both application services for local deployment.

## System overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                                   │
│  Next.js App Router — pages + /api/* routes                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐    ┌──────────────┐   ┌─────────────┐
   │ Postgres │    │ FastAPI      │   │ File storage│
   │ :5432    │    │ agents :8000 │   │ STORAGE_PATH│
   └──────────┘    └──────┬───────┘   └─────────────┘
                            │
              ┌─────────────┼─────────────┬───────────┐
              ▼             ▼             ▼           ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐ ┌──────────────┐
        │ LLM BYOK │  │ Semantic │  │ LaTeX    │ │ Supermemory  │
        │ provider │  │ Scholar  │  │ :8081    │ │ Local :6767  │
        └──────────┘  └──────────┘  └──────────┘ └──────────────┘
```

## Packages

| Path | Package | Purpose |
|------|---------|---------|
| `apps/web` | `web` | Next.js 15 UI, API routes, Postgres access |
| `apps/agents` | — | FastAPI agent service, LLM router, orchestration |
| `packages/cli` | `holocron` | Published npm CLI for `npx holocron start` |
| `packages/shared` | `@holocron/shared` | Zod schemas, node types, agent registry types |

Turbo orchestrates `dev`, `build`, and `lint` across workspaces.

## Web application

**Stack:** Next.js 15, React 19, shadcn/ui (Radix), Tailwind CSS v4 with tweakcn tokens, `@xyflow/react` (graph canvas), Zustand (canvas state).

The UI uses a **Minimal UI Kit** product shell (collapsible sidebar, page headers, card lists) with an editorial marketing home. **Light mode is the default**; dark mode toggles via `next-themes`. Typography: Inter + JetBrains Mono app-wide; Newsreader serif accents on the home page only. Graph nodes retain semantic category colors for research semantics.

**Pages:**

- `/` — landing
- `/research-graph`, `/research-graph/[workId]` — work list and canvas editor
- `/paper-generation`, `/paper-generation/[genId]` — generation list and live monitor
- `/references` — reference library
- `/agents` — agent health dashboard
- `/settings` — BYOK LLM configuration

**API routes** proxy AI work to the agents service and handle CRUD for works, references, and generations. Data access uses the raw `postgres` driver (`apps/web/src/lib/db.ts`).

Auth is local-only: a seeded `LOCAL_USER` UUID; no login UI.

## Agent service

**Stack:** Python 3.12, FastAPI, OpenAI SDK (OpenAI-compatible providers), httpx (Anthropic).

**Key modules:**

- `src/llm.py` — multi-provider LLM client with mock fallback
- `src/config.py` — settings, multi-key provider store, runtime `llm_config.json` override
- `src/event_store.py` — durable `generation_events` writes to Postgres
- `src/orchestrator/commander.py` — full paper generation pipeline (IMRaD, expansion, citations)
- `src/orchestrator/graph_context.py` — graph → typed buckets, snippets, topological flow
- `src/orchestrator/graph_contract.py` — per-node section obligations and validation
- `src/supermemory_client.py` — Supermemory Local wrapper (profiles, search, add)
- `src/agents/*` — planner, writer, reviewer, citation_verifier, typesetter, metadata, VLM review, parsers

**Config endpoints:**

- `GET /config/llm` — public provider info (no secrets)
- `POST /config/llm` — update provider; persists to `STORAGE_PATH/llm_config.json`

## CLI distribution

The `holocron` npm package ships:

- `holocron doctor` — prerequisite checks
- `holocron setup` — writes `~/.holocron/.env`
- `holocron start` — Docker Compose up, health wait, browser open
- `holocron stop` / `holocron status`

Release builds use pre-built images from GHCR (`docker-compose.release.yml`). Development uses `docker/docker-compose.yml` with volume mounts.

## Data model

Postgres schema (`db/migrations/`):

- **users** — stub for future auth; one local user seeded
- **research_works** — title, description, graph JSON (nodes + edges)
- **references** — bibliography entries with BibTeX and metadata
- **paper_generations** — generation jobs, status, output paths
- **generation_events** — durable process log (agent, event_type, message, metadata)

Files (PDFs, LaTeX, compiled output) live under `STORAGE_PATH`.

## Memory layer (Supermemory Local)

Holocron uses [Supermemory Local](https://supermemory.ai/docs/self-hosting/overview) as an **agent context layer** — not a replacement for Postgres.

| Store | Holds | Used by |
|-------|-------|---------|
| Postgres | Works, references, generations, graph structure | UI CRUD, job tracking |
| Supermemory | Extracted facts, profiles, PDF chunks, agent outputs | Planner, Writer, Commander prompts |

**Why both:** Postgres answers "what is the current state of work X?" Supermemory answers "what did we learn about topic Y across all prior sessions on work X?" See [SUPERMEMORY.md](SUPERMEMORY.md) for the full rationale matrix.

**Flow during generation:**

1. Commander calls `profile` + `search` before planning/writing; emits Supermemory events to process log
2. `GraphContract` built from graph + discovered refs; summary stored in Supermemory
3. Planner/writer outputs are `add`ed to `work_{workId}` after each phase
4. Per-section writes use `graph_node_ids` for targeted snippets and section-scoped flow
5. Citation verifier checks all bib keys before compile; targeted re-draft if uncovered
6. Events written to Postgres on each `_emit` (survives agent restarts)
7. Reference PDFs are ingested via web API routes
8. User preferences land in `user_{userId}` on settings save

Supermemory runs in Docker on port `6767`. `npx holocron start` includes it in the release stack.

## Research graph

Sixteen node types grouped into ideation, knowledge, execution, evidence, and control. Node field schemas and badge styles live in `packages/shared/src/node-field-schemas.ts`.

Generation can start from:

1. **Graph** — user builds a graph; `end` node triggers generation with full context
2. **Metadata** — wizard builds a synthetic graph from title, abstract, methods, etc.

## Paper generation flow

1. Web creates a `paper_generations` row and POSTs to `/agents/commander/generate`
2. Commander runs background job:
   - Profile + plan (Semantic Scholar → arXiv fallback)
   - Build `GraphContract`; store summary in Supermemory
   - Write sections using `graph_node_ids`, review loop, citation coverage checks
   - Validate graph contract; re-draft unsatisfied nodes
   - Citation verifier pass; expand thin sections if below page target
   - Compile LaTeX → VLM review
3. Events persist to `generation_events` via `event_store.py`; web polls `/api/generations/[genId]`
4. Output: `main.tex`, section files, `references.bib`, `main.pdf` under storage

### Process log

| Source | When |
|--------|------|
| Agents `on_event` → Postgres | During live generation (durable) |
| Web API sync from agents RAM | Fallback while job is in-flight |
| `scripts/backfill-generation-events.mjs` | Reconstruct timeline from disk for completed gens with empty events |

Detail UI (`ProcessLogPanel`) shows phase-grouped events; Supermemory memory events drill down via `DetailPanel`.
