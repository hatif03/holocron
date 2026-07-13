# Holocron / AcademicHub

AI-native research platform — map hypotheses, literature, and experiments on a visual research graph, then generate publication-ready papers with a multi-agent AI system powered by K2 Think V2.

## Quick Start (npm)

```bash
# One-command start (requires Docker + K2 Think API key)
npx holocron start

# Or install globally
npm install -g holocron
holocron setup   # configure API keys
holocron start   # launch at http://localhost:3000
holocron doctor  # check prerequisites
holocron status  # service health
holocron stop    # tear down
```

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

# Copy env template
cp .env.example .env

# Start full stack
docker compose -f docker/docker-compose.yml up --build

# Seed demo template (10 nodes, 13 edges)
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

- **Research Graph** — Visual canvas with 16 node types (idea, hypothesis, literature, experiment, etc.)
- **Paper Generation** — Multi-agent pipeline: Planner → Writer → Reviewer → Typesetter → Vlm Review
- **References** — Semantic Scholar search, PDF upload, AI paper analysis
- **Agents Dashboard** — Live status for all 9 agents
- **npm CLI** — `npx holocron start` for local deployment

## API Keys

| Key | Required | Get it |
|-----|----------|--------|
| K2 Think | Yes | [build.k2think.ai](https://build.k2think.ai/) |
| Semantic Scholar | No | [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api) |

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
