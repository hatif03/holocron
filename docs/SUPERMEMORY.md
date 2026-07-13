# Supermemory in Holocron

Holocron integrates [Supermemory Local](https://supermemory.ai/docs/self-hosting/overview) as a **semantic memory layer** for AI agents. Postgres stores structured CRUD data; Supermemory stores **extracted, searchable context** that agents recall across generations.

## Why Holocron uses Supermemory

Research paper generation is a multi-step, multi-session process. Without memory, each agent run starts cold: the planner rediscovers literature, the writer forgets prior section tone, and review feedback never influences the next draft.

Postgres records *what happened* (generation status, event logs, reference rows). It does not:

- Semantically search prior agent outputs by meaning
- Maintain evolving user profiles (style preferences, provider choices)
- OCR and chunk uploaded PDFs for hybrid retrieval
- Auto-extract durable facts from long agent conversations

Supermemory Local solves this on `http://localhost:6767` — fully on the user's machine, aligned with Holocron's local-first positioning and the [Localhost:6767 hackathon](https://instinctive-chance-ed9.notion.site/Localhost-6767-392222a60c568030ab86e7729d765bbe).

**Design principle:** Postgres remains the source of truth. Supermemory **augments LLM prompts** — it never replaces database rows.

## Architecture

```
Browser → Next.js /api/* → FastAPI agents → LLM (K2 Think)
                ↓                ↓
           Postgres         Supermemory :6767
           STORAGE_PATH     (agent context)
```

| Layer | Role |
|-------|------|
| Postgres | Works, references, generations, graph nodes — authoritative CRUD |
| File storage | PDFs, LaTeX, compiled output |
| Supermemory | Profiles, hybrid search, document ingestion — agent context |

Implementation:

- **Agents:** [`apps/agents/src/supermemory_client.py`](../apps/agents/src/supermemory_client.py)
- **Web:** [`apps/web/src/lib/supermemory-client.ts`](../apps/web/src/lib/supermemory-client.ts)

## Feature map (rationale)

| Integration point | File / route | Supermemory feature | Why we use it | Why not Postgres alone? |
|-------------------|--------------|---------------------|---------------|-------------------------|
| Pipeline start | `commander.py` → `run_generation()` | **User Profiles** (`profile`) | Load work + user context before agents run | Postgres stores generation records, not extracted semantic facts |
| After planning | `commander.py` | **Add documents** (`add` + `customId`) | Persist plan and discovered literature for future runs | Plan JSON in events is not semantically searchable |
| Before each section | `commander.py` | **Hybrid search** (`searchMode: hybrid`) | Retrieve section-relevant prior drafts and reference chunks | No vector search; graph nodes miss paraphrased context |
| After writer/reviewer | `commander.py` | **Add documents** | Capture draft and review loop outcomes | Review feedback in events is not injected into future prompts |
| Pipeline complete | `commander.py` | **Add documents** | Store generation milestone summary | Status field alone does not convey what was learned |
| Planner local recall | `planner.py` | **Hybrid search** | Complement Semantic Scholar with user's ingested library | S2 only knows public literature |
| Reference analyze | `POST /api/references/analyze` | **Add documents** | Make analysis semantically retrievable during writing | `references_lib.analysis` requires exact ID fetch |
| Reference PDF upload | `POST /api/references/upload`, `works/[workId]/upload` | **File ingestion** | OCR/chunk PDFs for hybrid search | PDFs on disk are opaque to agents without RAG |
| Settings save | `POST /api/settings/llm` | **Add documents** → `user_{userId}` | Persist style/provider prefs across works | `llm_config.json` is operational config, not semantic context |
| Agents startup | `main.py` | **Settings** (`PATCH /v3/settings`) | Holocron-specific memory extraction filter | No Postgres equivalent |
| npm deployment | `holocron start` | **Self-hosted Local** | Memory ships with one-command install | Cloud memory contradicts local-first |

## containerTag conventions

| Scope | containerTag | Use |
|-------|-------------|-----|
| Research work | `work_{workId}` | Plans, drafts, references, generations |
| User | `user_{userId}` | Cross-work preferences (`00000000-0000-0000-0000-000000000001` locally) |
| Generation updates | `customId: gen_{generationId}_*` | Update same logical document on re-runs |

Metadata on writes: `{ type, generationId, workId, section?, referenceId? }`.

## Per-component behavior

### Paper generation pipeline

1. **Start** — `context_for_work(work_id, title)` calls `profile` for user + work ([quickstart](https://supermemory.ai/docs/quickstart))
2. **Planner** — hybrid search for local refs; after plan, `add` with `customId: gen_{id}_plan`
3. **Writer** — hybrid search per section; inject into `DraftRequest.context.memory`
4. **Reviewer** — store feedback via `add` when content is revised
5. **Complete** — `add` generation summary with `type: generation_complete`

### Reference library

- **Analyze** — when `work_id` is provided, store analysis JSON to `work_{workId}`
- **Upload** — ingest PDF via `/v3/documents/file` ([add-memories](https://supermemory.ai/docs/add-memories))

### User preferences

On settings save, store LLM provider/model string to `user_{userId}`.

### Graceful degradation

If `SUPERMEMORY_API_KEY` is unset or Supermemory is down:

- All memory calls no-op
- Paper generation continues normally
- Agents `/health` reports `supermemory: disabled | ok | unreachable`

## Setup

### Prerequisites

- Docker Desktop
- K2 Think API key in `.env` (memory extraction LLM)

### Development (repo root)

```powershell
.\docker\supermemory\bootstrap.ps1
```

Or:

```bash
docker compose -f docker/docker-compose.yml up supermemory -d --build
```

Copy `sm_...` from logs into `.env`:

```dotenv
SUPERMEMORY_API_URL=http://localhost:6767
SUPERMEMORY_API_KEY=sm_...
K2THINK_API_KEY=<your-key>
```

### npm release (`npx holocron start`)

Supermemory is included in the release compose stack. On first start, the CLI captures the `sm_*` key into `~/.holocron/.env` automatically.

### Docker networking

| Context | `SUPERMEMORY_API_URL` |
|---------|----------------------|
| Host / local dev | `http://localhost:6767` |
| Agents/web containers | `http://host.docker.internal:6767` |

### Smoke test

```bash
curl -X POST http://localhost:6767/v3/documents \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"test","containerTag":"holocron_dev"}'
```

```bash
curl -X POST http://localhost:6767/v4/search \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q":"test","containerTag":"holocron_dev","searchMode":"hybrid"}'
```

## Cursor workspace

- **MCP:** `.cursor/mcp.json` — Supermemory docs search
- **Skill:** `.cursor/skills/supermemory-local/`
- **Rule:** `.cursor/rules/supermemory-local.mdc`

## API reference

Canonical endpoints (local server):

- `POST /v3/documents` — add content
- `POST /v3/documents/file` — upload PDFs
- `POST /v4/search` — hybrid search ([search](https://supermemory.ai/docs/search))
- `POST /v4/profile` — user profile + optional search
- `PATCH /v3/settings` — org filter prompt

See [`.cursor/skills/supermemory-local/references/canonical-api.md`](../.cursor/skills/supermemory-local/references/canonical-api.md).

## References

- [Self-hosting overview](https://supermemory.ai/docs/self-hosting/overview)
- [Quickstart](https://supermemory.ai/docs/quickstart)
- [Add memories](https://supermemory.ai/docs/add-memories)
- [Search](https://supermemory.ai/docs/search)
- [Configuration](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
