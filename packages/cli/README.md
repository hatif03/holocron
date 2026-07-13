# holocron CLI

npm package published as **`holocron`**. One-command local deployment for the Holocron research platform.

## Install

```bash
# Run without installing
npx holocron start

# Or install globally
npm install -g holocron
```

**Prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Commands

### `holocron start`

Starts the full stack (Postgres, agents, LaTeX, web). On first run, runs `holocron setup` if `~/.holocron/.env` is missing. Waits for health endpoints and opens the browser at `http://localhost:3000`.

### `holocron setup`

Interactive wizard:

1. Choose LLM provider (default: K2 Think)
2. Enter API key (Enter for mock mode)
3. Confirm base URL and model
4. Optional Semantic Scholar key

Writes config to `~/.holocron/.env`.

### `holocron doctor`

Checks Node.js 20+, Docker availability, and ports 3000 / 8000 / 5432.

### `holocron status`

Prints service health summary.

### `holocron stop`

Tears down Docker Compose containers.

## Config paths

| Path | Contents |
|------|----------|
| `~/.holocron/.env` | Environment variables for Docker |
| `~/.holocron/data/storage` | User file storage |
| `~/.holocron/data/postgres` | Postgres data (release stack) |

## Development

From monorepo root:

```bash
npm run build --workspace=holocron
node packages/cli/dist/index.js doctor
```

Release workflow publishes to npm and pushes Docker images to GHCR on version tags.

See [../../README.md](../../README.md) and [../../docs/CONFIGURATION.md](../../docs/CONFIGURATION.md) for full documentation.
