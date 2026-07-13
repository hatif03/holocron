# Supermemory Local (Hackathon Setup)

Run Supermemory Local on Windows via Docker using the official Linux binary. Holocron uses K2 Think (OpenAI-compatible) for memory extraction.

## Prerequisites

- Docker Desktop running on Windows
- K2 Think API key in `.env` (see `.env.example`)

## Quick start

From the repo root:

```powershell
.\docker\supermemory\bootstrap.ps1
```

Or with Git Bash / WSL:

```bash
bash docker/supermemory/bootstrap.sh
```

The script:

1. Builds and starts the `supermemory` Docker service
2. Waits for the `sm_...` API key in container logs
3. Writes `SUPERMEMORY_API_URL` and `SUPERMEMORY_API_KEY` to `.env`

### Manual start

```bash
docker compose -f docker/docker-compose.yml up supermemory -d --build
docker logs $(docker compose -f docker/docker-compose.yml ps -q supermemory)
```

Copy the `sm_...` key from logs into `.env`:

```dotenv
SUPERMEMORY_API_URL=http://localhost:6767
SUPERMEMORY_API_KEY=sm_...
```

## Smoke test

```bash
curl http://localhost:6767/v3/documents \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"Holocron hackathon test","containerTag":"holocron_dev"}'
```

Search:

```bash
curl http://localhost:6767/v4/search \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q":"hackathon","containerTag":"holocron_dev","searchMode":"hybrid"}'
```

## How it works

| Component | Detail |
|-----------|--------|
| Image | [`docker/supermemory/Dockerfile`](../docker/supermemory/Dockerfile) — Debian + `supermemory-server-linux-x64` (server-v0.0.5) |
| Port | `6767` |
| Data | Docker volume `supermemory_data` at `/data` |
| LLM | Reuses `K2THINK_*` env vars mapped to `OPENAI_*` inside the container |

## Cursor workspace

- **MCP:** `.cursor/mcp.json` — Supermemory docs search (vibe-coding)
- **Skill:** `.cursor/skills/supermemory-local/` — integration guidance
- **Rule:** `.cursor/rules/supermemory-local.mdc` — always-on conventions

Reload MCP in Cursor after setup (Settings → MCP).

## Configure Holocron filter (once)

```bash
curl -X PATCH http://localhost:6767/v3/settings \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shouldLLMFilter": true,
    "filterPrompt": "This is Holocron, a research paper generation app. containerTag is work_{workId} or user_{userId}. We store research context, references, agent outputs, and user preferences."
  }'
```

## Fallback: WSL

If Docker is unavailable, run natively in WSL2:

```bash
curl -fsSL https://supermemory.ai/install | bash
export OPENAI_API_KEY=$K2THINK_API_KEY
export OPENAI_BASE_URL=https://www.k2think.ai/api/chat/completions
export OPENAI_MODEL=MBZUAI-IFM/K2-Think-v2
supermemory-server
```

Access from Windows at `http://localhost:6767`.

## References

- [Self-hosting overview](https://supermemory.ai/docs/self-hosting/overview)
- [Vibe-coding setup](https://supermemory.ai/docs/vibe-coding)
- [Localhost:6767 hackathon](https://instinctive-chance-ed9.notion.site/Localhost-6767-392222a60c568030ab86e7729d765bbe)
