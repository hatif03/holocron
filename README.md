# Holocron

AI-native research platform — map hypotheses, literature, and experiments on a visual research graph, then generate publication-ready papers with a multi-agent AI system. Star Wars–inspired local UI; bring your own LLM key.

## Quick Start

**Only prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
npx holocron start
```

On first run this will:

1. Prompt for an LLM provider (default: **K2 Think**) and API key — press Enter for mock mode
2. Start Postgres, agents, LaTeX, and the web UI via Docker
3. Wait until services are healthy
4. Open [http://localhost:3000](http://localhost:3000)

```bash
# Or install globally
npm install -g holocron
holocron setup    # configure BYOK providers
holocron start    # launch
holocron doctor   # check Docker + ports
holocron status   # service health
holocron stop     # tear down
```

## LLM providers (BYOK)

Configure via `holocron setup` or **Settings** in the UI (`/settings`).

| Provider | Notes |
|----------|--------|
| **K2 Think** | Default for demos — [build.k2think.ai](https://build.k2think.ai/) |
| OpenAI | GPT models |
| Anthropic | Claude via Messages API |
| Google | Gemini (OpenAI-compatible endpoint) |
| OpenRouter | Many models behind one key |
| Custom | Any OpenAI-compatible base URL |

Empty / mock keys enable placeholder generation for local tours.

Optional: [Semantic Scholar API key](https://www.semanticscholar.org/product/api) for richer literature search.

## Development

### Prerequisites

- Node.js 20+
- Docker Desktop
- Python 3.12+ (for local agent development)

### Setup

```bash
git clone https://github.com/hatif03/holocron.git
cd holocron
npm install
cp .env.example .env
docker compose -f docker/docker-compose.yml up --build
node scripts/seed-template.mjs
```

Open [http://localhost:3000](http://localhost:3000)

### Monorepo structure

```
holocron/
├── apps/web/          Next.js frontend
├── apps/agents/       Python FastAPI multi-agent service
├── packages/cli/      holocron npm CLI
├── packages/shared/   Shared types and schemas
├── templates/         LaTeX venue templates (Nature, IEEE, ICML)
├── docker/            Docker Compose stacks
└── db/migrations/     Postgres schema
```

## Features

- **Research Graph** — Visual canvas with 16 node types
- **Paper Generation** — Planner → Writer → Reviewer → Typesetter → VLM Review
- **References (Archives)** — Semantic Scholar, arXiv, PDF upload, AI analysis
- **Agents Dashboard** — Live status for the writing crew
- **Settings** — In-app BYOK provider switching
- **npm CLI** — `npx holocron start` for local deployment

## Agents

1. **Paper Parser** — PDF understanding and structured extraction
2. **Template Parser** — LaTeX venue template rules
3. **Commander** — Pipeline orchestrator
4. **Writer** — LaTeX section generation
5. **Typesetter** — Self-healing LaTeX compilation
6. **Metadata** — Simple-mode paper from metadata fields
7. **Reviewer** — Logic and style review loop
8. **Planner** — Outline + Semantic Scholar discovery
9. **Vlm Review** — Visual PDF layout detection

## License

MIT
