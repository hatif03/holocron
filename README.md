# Holocron

**Holocron** is a local-first AI research platform. Map hypotheses, literature, and experiments on a visual research graph, then generate publication-ready LaTeX and PDF output through a multi-agent writing pipeline. The UI uses the [WhatsApp tweakcn theme](https://tweakcn.com/themes/cmmbmmxsb000104l5fqg5b4x3) — warm greens and comfortable density for long research sessions. Inference is bring-your-own-key (BYOK).

Everything runs on your machine. **Prerequisites:** [Node.js 20+](https://nodejs.org/) and [Docker Desktop](https://www.docker.com/products/docker-desktop/) — see the [install guide](https://holocron.vercel.app/install) or run `holocron install-guide`.

Marketing site: [holocron.vercel.app](https://holocron.vercel.app) (deploy `apps/marketing` to Vercel).

---

## Quick start

```bash
# 1. Verify prerequisites (Node 20+, Docker running, ports free)
npx holocron-research@1.0.4 doctor

# 2. First run — setup wizard + Docker images + browser
npx holocron-research@1.0.4 start
```

First run:

1. Runs the setup wizard if `~/.holocron/.env` does not exist
2. Prompts for an LLM provider (default: **K2 Think**) — press Enter for mock mode
3. Starts Postgres, agents, LaTeX, **Supermemory Local**, and the web UI
4. Waits for health checks and opens [http://localhost:3000](http://localhost:3000)

### Persistent research memory

Holocron uses [Supermemory Local](https://supermemory.ai/docs/self-hosting/overview) so agents remember prior plans, drafts, references, and preferences across paper generations — all on your machine at `localhost:6767`. See [docs/SUPERMEMORY.md](docs/SUPERMEMORY.md).

### CLI commands

| Command | Description |
|---------|-------------|
| `holocron start` | Start the full stack |
| `holocron setup` | Configure LLM provider and API keys |
| `holocron doctor` | Check Node, Docker, Compose, and port availability |
| `holocron install-guide` | Step-by-step install for fresh systems |
| `holocron status` | Show service health |
| `holocron seed` | Load OWID climate-health showcase graph |
| `holocron stop` | Tear down containers |

**Showcase demos** (from repo root after `start:local`):

```bash
npm run seed:showcase              # OWID CO₂ / life expectancy graph
npm run seed:showcase:renewables   # Energy transition graph + recall memories
npm run seed:recall:demo           # Pre-seed Supermemory for both showcases
npm run gen:showcase "Renewable"   # Generate paper from renewables work
npm run verify:showcase            # Verify PDFs + memory recall timeline
```

See [docs/DEMO.md](docs/DEMO.md) for a full demo video script.

Install globally:

```bash
npm install -g holocron-research
holocron start
```

---

## What you can do

| Area | Route | Description |
|------|-------|-------------|
| **Research Graph** | `/research-graph` | Visual canvas with 16 node types — ideation, knowledge, execution, evidence |
| **Discover** | Research graph sidebar | Rank related papers via Semantic Scholar; add to library or literature nodes |
| **Ask** | Research graph sidebar | Memory-grounded citation Q&A scoped to `work_{id}` |
| **Memory** | Research graph sidebar | Search and trace Supermemory activity for the current work |
| **Paper Generation** | `/paper-generation` | Multi-agent pipeline from graph or metadata wizard |
| **References** | `/references` | Semantic Scholar, arXiv, PDF upload, BibTeX import, AI analysis |
| **Agents** | `/agents` | Live status for the multi-agent pipeline |
| **Settings** | `/settings` | Switch LLM provider and API keys (BYOK) |

### Paper generation pipeline

```
Planner → Writer ⇄ Reviewer → Citation Verifier → Typesetter → VLM Review
         ↑ GraphContract (per-node obligations) ↑
         Supermemory profile / search / store at each phase
```

- **Graph mode** — build a research graph, then generate from the `end` node
- **Metadata mode** — four-step wizard: fields → BibTeX → options → confirm
- **Process log** — events persist to Postgres (`generation_events`); backfill from disk with `npm run gen:backfill-events`
- **Graph-faithful** — `GraphContract` tracks which nodes must appear in which sections; targeted re-draft on unsatisfied nodes

Venue templates: Nature, IEEE, ICML.

---

## LLM providers (BYOK)

Configure via **Settings** in the UI or `holocron setup`. Keys stay local — Holocron does not require a cloud account.

| Provider | Default model | Notes |
|----------|---------------|-------|
| **K2 Think** | `MBZUAI-IFM/K2-Think-v2` | Recommended for demos — [build.k2think.ai](https://build.k2think.ai/) |
| Groq | `llama-3.3-70b-versatile` | Fast OpenAI-compatible inference |
| OpenAI | `gpt-4o` | Official API |
| Anthropic | `claude-sonnet-4-20250514` | Messages API |
| Google | `gemini-2.0-flash` | OpenAI-compatible endpoint |
| OpenRouter | `openai/gpt-4o` | Many models behind one key |
| Custom | — | Any OpenAI-compatible base URL |

Leave the API key empty (or use `mock-key-for-dev`) to run in **mock mode** — placeholder content for local tours without a key.

Optional: [Semantic Scholar API key](https://www.semanticscholar.org/product/api) for richer literature discovery.

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for all environment variables.

---

## Architecture

```mermaid
flowchart LR
  Browser["Browser :3000"] --> Web["Next.js web"]
  Web --> DB["Postgres"]
  Web --> Agents["FastAPI agents :8000"]
  Web --> SM["Supermemory :6767"]
  Agents --> LLM["LLM provider BYOK"]
  Agents --> Latex["LaTeX service :8081"]
  Agents --> SM
  Agents --> Storage["Local storage"]
```

| Service | Port | Role |
|---------|------|------|
| Web | 3000 | Next.js App Router UI and API routes |
| Agents | 8000 | Python FastAPI multi-agent service |
| Postgres | 5432 | Research works, references, generations |
| LaTeX | 8081 | Self-healing PDF compilation |
| Supermemory | 6767 | Local semantic memory (work-scoped context) |

End-user config lives at `~/.holocron/.env`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for monorepo layout and data flow.

---

## Development

### Prerequisites

- Node.js 20+
- Docker Desktop
- Python 3.12+ (optional — for running agents outside Docker)

### From source

```bash
git clone https://github.com/hatif03/holocron.git
cd holocron
npm install
cp .env.example .env
docker compose -f docker/docker-compose.yml up --build
```

Seed a demo research graph (10 nodes, 13 edges):

```bash
node scripts/seed-template.mjs
```

Open [http://localhost:3000](http://localhost:3000).

### Monorepo layout

```
holocron/
├── apps/web/           Next.js 15 frontend
├── apps/agents/        Python FastAPI agent service
├── packages/cli/       holocron-research npm CLI (`npx holocron-research@latest`)
├── packages/shared/    Shared Zod schemas and types
├── templates/          LaTeX venue templates
├── docker/             Docker Compose stacks
├── db/migrations/      Postgres schema
└── docs/               Architecture and configuration guides
```

### Scripts

```bash
npm run dev          # Turbo dev (all workspaces)
npm run build        # Build all packages
npm run lint         # Lint
npm run seed         # Seed demo template graph
npm run seed:all     # Full demo pipeline (refs + works + template)
npm run graph:respread   # Re-space graph node layout
npm run gen:live     # Live paper generation via agents API
npm run gen:verify   # Verify latest generation artifacts
npm run gen:cleanup  # Remove failed/stub generations
npm run gen:backfill-events  # Reconstruct process log from disk
npm run seed:showcase        # OWID climate-health demo graph
npm run seed:showcase:renewables
npm run seed:recall:demo
npm run verify:showcase
npm run cleanup:e2e          # Remove E2E test works + verify memory purge
npm run verify:supermemory   # Supermemory E2E (self-cleaning)
npm run verify:discover-ask  # Discover + Ask with real OWID data
```

See also [docs/CITE_SMART_BORROW.md](docs/CITE_SMART_BORROW.md) for Discover/Ask design notes.

App-specific guides: [apps/web/README.md](apps/web/README.md), [packages/cli/README.md](packages/cli/README.md).

---

## Agents

| Agent | Role |
|-------|------|
| **Paper Parser** | PDF understanding and structured extraction |
| **Template Parser** | LaTeX venue template rules |
| **Commander** | Pipeline orchestrator |
| **Planner** | Outline + Semantic Scholar / arXiv discovery |
| **Writer** | IMRaD LaTeX section generation (graph-grounded) |
| **Reviewer** | Logic, style, length, citation coverage review loop |
| **Citation Verifier** | Ensures all bib keys and literature nodes are cited |
| **Typesetter** | Self-healing LaTeX compilation |
| **Metadata** | Simple-mode paper from metadata fields |
| **VLM Review** | Visual PDF layout detection |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Docker not running | Start Docker Desktop, then `holocron doctor` |
| Port in use | Stop conflicting services on 3000, 8000, or 5432 |
| Agents offline in Settings | Ensure stack is up: `holocron start` |
| Mock content only | Add a real API key in Settings or `holocron setup` |
| Process log empty on old runs | `npm run gen:backfill-events -- <genId>` |
| Agents offline during generation | Check `/agents` health; ensure Docker agents on `:8000` |

---

## License

MIT
