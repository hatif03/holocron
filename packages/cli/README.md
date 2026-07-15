# holocron-research CLI v1.0.1

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

## Release

Tag `v1.0.0` (or later) triggers [`.github/workflows/release.yml`](../../.github/workflows/release.yml):

- Builds and pushes GHCR images (`holocron-web`, `holocron-agents`, `holocron-latex`, `holocron-supermemory`)
- Publishes `holocron@<version>` to npm (requires `NPM_TOKEN` secret)

```bash
git tag v1.0.0
git push origin v1.0.0
```

See [../../README.md](../../README.md) for full documentation.
