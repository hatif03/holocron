# holocron-research CLI v1.0.6

npm package published as **`holocron-research`**. One-command local deployment for the Holocron research platform.

## Install (fresh system)

1. Install [Node.js 20 LTS](https://nodejs.org/en/download)
2. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux)
3. Run:

```bash
npx holocron-research@latest doctor
npx holocron-research@latest start
```

For a printable checklist: `holocron install-guide`

Marketing site: [holocron.vercel.app/install](https://holocron.vercel.app/install)

## Commands

| Command | Description |
|---------|-------------|
| `holocron start` | Pull images, start stack, open browser |
| `holocron setup` | LLM provider wizard → `~/.holocron/.env` |
| `holocron doctor` | Check Node, Docker, Compose, ports |
| `holocron install-guide` | Full install steps for Windows / macOS / Linux |
| `holocron status` | Service health (web, agents, DB, LaTeX, Supermemory) |
| `holocron seed` | Load OWID climate-health showcase graph |
| `holocron stop` | Tear down containers |

First `start` downloads ~2–4 GB of Docker images and runs DB migrations automatically.

## What's new in v1.0.6

- **LaTeX formatting** — proper `\begin{abstract}` block, figure path fix, extra compile pass
- **Dev stack reliability** — isolated Next.js `.next` cache in Docker; API 500 fix after local builds
- **Showcase curation** — two demo papers (renewables + OWID) with Supermemory search recalls

## What's new in v1.0.5

- **Supermemory search fix** — `dreaming: instant` on all writes; indexing wait; search recalls visible in Memory trace
- **Paper detail UX** — independent panel scroll; icon-only back button; loading skeletons
- **Typography** — Plus Jakarta Sans (UI) + Instrument Serif (logo) via Google Fonts
- **Demo scripts** — [docs/DEMO_NARRATION.md](../../docs/DEMO_NARRATION.md) voiceover for recording

## What's new in v1.0.4

- **Supermemory reads** — planner, writer, and reviewer use explicit recall prompts; review feedback stored for later rounds; second-run draft recall
- **Memory trace** — full profile/search/store timeline on paper detail
- **WhatsApp theme** — tweakcn green palette, larger sidebar and controls
- **Two showcase graphs** — OWID climate + renewables energy transition (`npm run seed:showcase:renewables` from repo checkout)
- **Paper detail UX** — scroll, asset preview route, idle polling fixes

## What's new in v1.0.3

- **Memory** — traceable Supermemory UX (activity strip, health dot, `work_{id}` scoping)
- **Discover** — Semantic Scholar paper discovery ranked by title overlap, stored in project memory
- **Ask** — memory-grounded citation Q&A on the research graph sidebar
- **Cleanup** — deleting a research work purges its Supermemory container

See [docs/CITE_SMART_BORROW.md](https://github.com/hatif03/holocron/blob/main/docs/CITE_SMART_BORROW.md) and [docs/SUPERMEMORY.md](https://github.com/hatif03/holocron/blob/main/docs/SUPERMEMORY.md).

## Release

Tag `v1.0.6` (or later) triggers [`.github/workflows/release.yml`](../../.github/workflows/release.yml):

- Builds and pushes GHCR images (`holocron-web`, `holocron-agents`, `holocron-latex`, `holocron-supermemory`)
- Publishes `holocron-research@<version>` to npm (requires `NPM_TOKEN` secret)

```bash
git tag v1.0.6
git push origin v1.0.6
```

See [../../README.md](../../README.md) for full documentation.
