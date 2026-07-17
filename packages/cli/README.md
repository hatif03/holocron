# holocron-research CLI

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

Marketing site: [holocron-tawny.vercel.app/install](https://holocron-tawny.vercel.app/install)

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

## Documentation

See the [main README](https://github.com/hatif03/holocron/blob/main/README.md) for features, architecture, and troubleshooting.

- [docs/SUPERMEMORY.md](https://github.com/hatif03/holocron/blob/main/docs/SUPERMEMORY.md) — local memory integration
- [Demo video](https://youtu.be/5Vnh6s4N_Z4)

## Release

Tag `v*` triggers [`.github/workflows/release.yml`](../../.github/workflows/release.yml):

- Builds and pushes GHCR images (`holocron-web`, `holocron-agents`, `holocron-latex`, `holocron-supermemory`)
- Publishes `holocron-research@<version>` to npm (requires `NPM_TOKEN` secret)

## License

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/) — personal, research, and educational use permitted; commercial use requires separate permission.
