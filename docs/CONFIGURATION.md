# Holocron configuration

Holocron reads configuration from environment variables. End users typically manage these through `holocron setup` or the **Settings** page (`/settings`).

## Config file locations

| Path | Purpose |
|------|---------|
| `~/.holocron/.env` | CLI / Docker release stack (created by `holocron setup`) |
| `.env` (repo root) | Local development (`cp .env.example .env`) |
| `{STORAGE_PATH}/llm_config.json` | Runtime LLM override (written by agents or Settings UI) |

On Windows, `~/.holocron` resolves to `C:\Users\<you>\.holocron`.

## LLM provider

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | `k2think`, `openai`, `anthropic`, `google`, `openrouter`, `custom` | `k2think` |
| `LLM_API_KEY` | Active provider API key | — |
| `LLM_BASE_URL` | Override base URL | Provider default |
| `LLM_MODEL` | Model identifier | Provider default |

### Provider-specific aliases (back-compat)

| Provider | Env key |
|----------|---------|
| K2 Think | `K2THINK_API_KEY`, `K2THINK_BASE_URL`, `K2THINK_MODEL` |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GOOGLE_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |

### Default endpoints and models

| Provider | Base URL | Default model |
|----------|----------|---------------|
| K2 Think | `https://www.k2think.ai/api` | `MBZUAI-IFM/K2-Think-v2` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Anthropic | `https://api.anthropic.com` | `claude-sonnet-4-20250514` |
| Google | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o` |
| Custom | User-defined | User-defined |

### Mock mode

If the resolved API key is empty or `mock-key-for-dev`, agents return placeholder JSON and LaTeX. Useful for UI demos without spending tokens.

## Other services

| Variable | Description | Default |
|----------|-------------|---------|
| `SEMANTIC_SCHOLAR_API_KEY` | Optional — richer paper search | — |
| `DATABASE_URL` | Postgres connection string | `postgresql://holocron:holocron@localhost:5432/holocron` |
| `STORAGE_PATH` | Uploaded files and generation output | `./storage` |
| `AGENTS_SERVICE_URL` | Web → agents (server-side) | `http://localhost:8000` |
| `NEXT_PUBLIC_AGENTS_URL` | Browser → agents (if needed) | `http://localhost:8000` |
| `LATEX_SERVICE_URL` | Agents → LaTeX compiler | `http://localhost:8081` |
| `AUTH_MODE` | `local` (only mode implemented) | `local` |

## Changing settings at runtime

1. Open **Settings** at `/settings`, pick provider, enter key/model, save
2. Or run `holocron setup` and restart the stack

Settings POST to agents `/config/llm`, which updates in-memory config and writes `llm_config.json`. No container restart required for LLM changes.

## Docker Compose

Development (`docker/docker-compose.yml`) passes LLM variables from `.env` into the agents container.

Release (`packages/cli/assets/docker-compose.release.yml`) uses `env_file: ~/.holocron/.env`.
