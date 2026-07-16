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
| Memory UI events | `commander.py` → `_emit` | **Add + search** | Process log shows profile/search/store with preview | Plain text wall in UI was search-only |
| Graph contract | `commander.py` | **Add documents** | Store `GraphContract` summary at generation start | Node obligations not searchable across sections |
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

1. **Start** — `context_for_work(work_id, title)` calls `profile` for user + work; passed to **Planner** and every **Writer** section (refreshed per section)
2. **GraphContract** — contract summary `add`ed with `customId: gen_{id}_contract`
3. **Planner** — hybrid search + profile context; after plan, `add` with `customId: gen_{id}_plan`
4. **Writer** — hybrid search per section + prior-section draft recall; explicit prompt blocks for `memory`, `section_memory`, `prior_sections_memory`; `add` each section draft
5. **Reviewer** — search prior review feedback (stored after each non-approved round); profile + review memory in all review paths
6. **Complete** — `add` generation summary with `type: generation_complete`

**Second run on same work:** Introduction/Methods searches recall prior `gen_*_{section}` drafts — visible in Memory trace `search` events with `recalledCount > 0`.

### Indexing and `dreaming: instant`

Supermemory processes documents asynchronously. The default `dreaming: "dynamic"` batches related documents before extracting searchable memories — fine for bulk ingest, but Holocron stores isolated agent outputs (planner, sections, reviews) that must be recallable within seconds.

Holocron sets **`dreaming: "instant"`** on every `POST /v3/documents` write (agents, web, seed scripts) so each store becomes searchable on its own.

After each section store, the pipeline calls **`wait_for_searchable(work_id, query)`** — polling `POST /v4/search` until hits appear (or timeout). Search threshold is **`SUPERMEMORY_SEARCH_THRESHOLD` (0.3)** in `@holocron/shared`.

Memory trace **`search` events** are emitted for every search attempt (`attempted: true`, `recalledCount` may be 0). Re-seed showcase works after upgrading: `npm run seed:recall:demo`.

Diagnostic: `node scripts/diagnose-supermemory-search.mjs`

### Web UI (MemoryView)

- Research graph sidebar **Memory** tab — search/profile for `work_{id}`
- **Discover** tab — ranked literature discovery with Supermemory persistence
- **Ask** tab — memory-grounded Q&A with per-response recall chips
- Paper generation **Memory trace** panel (collapsed by default)
- `MemoryActivityStrip` — expandable client-side activity timeline
- App shell memory health dot (green/amber/gray)

See [CITE_SMART_BORROW.md](./CITE_SMART_BORROW.md) for discovery and ask chat details.

### memoryTrace responses

Write APIs return a `memoryTrace` object where applicable:

| Route | `memoryTrace.source` |
|-------|---------------------|
| `PUT /api/works/[workId]` (graph save) | `graph` |
| `POST /api/works/[workId]/upload` | `data_file` |
| `POST /api/references/analyze` | `reference` |
| `POST /api/works/[workId]/discover` | `discover` |
| `POST /api/works/[workId]/ask` | `ask` (read + write) |

Client code calls `pushMemoryTrace()` to populate the activity strip without polling.

Shared component: `apps/web/src/components/memory/MemoryView.tsx`

| Surface | API | Features |
|---------|-----|----------|
| Generation detail | `GET /api/generations/[genId]/memory/recalls` | Full pipeline recall timeline from events |
| Generation detail (live) | `GET /api/generations/[genId]/memory` | On-demand search when drilling into an event |
| Research graph sidebar | `GET /api/works/[workId]/memory/search` | Hybrid search |
| Profile block | `GET /api/works/[workId]/memory/profile` | Static + dynamic profile + hits |

`searchMemoriesRich` returns `{ text, score, customId, metadata, type }` for expandable cards with type badges (`planner`, `writer`, `graph`, `reference`, `discovered_paper`, `ask`, `data_file`).

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

- **MCP (docs):** `.cursor/mcp.json` → `supermemory-ai` — cloud documentation search
- **MCP (local):** `.cursor/mcp.json` → `supermemory-local` — `http://localhost:6767/mcp` (add `Authorization: Bearer sm_...` header locally; never commit keys)
- **Skill:** `.cursor/skills/supermemory-local/`
- **Rule:** `.cursor/rules/supermemory-local.mdc`

## Changelog: pre-Supermemory → current

Holocron originally used **Postgres + file storage only**. The Supermemory integration added a semantic memory layer without replacing CRUD.

| Version | Integration | File / route | Supermemory API | Why added | Why Postgres alone was insufficient |
|---------|-------------|--------------|-----------------|-----------|-------------------------------------|
| v0 (baseline) | — | — | — | CRUD only | No semantic recall across sessions |
| v1 | Pipeline profile | `commander.py` | `POST /v4/profile` | Load work + user context at generation start | Generation rows don't extract durable facts |
| v1 | Planner search | `planner.py` | `POST /v4/search` (hybrid) | Recall ingested library before Semantic Scholar | S2 only knows public literature |
| v1 | Section search | `commander.py` | hybrid search | Per-section draft recall | No vector search in Postgres |
| v1 | Agent output store | `commander.py` | `POST /v3/documents` | Plans, drafts, reviews, milestones | Event logs aren't semantically searchable |
| v2 | VLM memory | `commander.py` | add | Store layout review issues | PDF compile status lacks layout detail |
| v2 | Reviewer memory | `commander.py` + `reviewer.py` | search + add | Prior review feedback in context | Reviewer had no memory hook |
| v2 | Reference summary | `POST /api/references/analyze` | add (compact summary) | Searchable analysis without embedding noise | Full JSON in PG requires exact ID fetch |
| v2 | Graph snapshot | `PUT /api/works/[workId]` | add | Hypothesis structure recall | Graph JSON in PG isn't injected into prompts |
| v2 | Memory search API | `GET /api/works/[workId]/memory/search` | hybrid search | UI/API library search | No web-side search before |
| v3 | Profile API | `GET /api/works/[workId]/memory/profile` | `POST /v4/profile` | Static + dynamic profile in UI | Search-only UI showed raw text |
| v3 | Memory events | `commander.py` `_emit` | profile/search/store previews | Process log drill-down | Events lacked memory metadata |
| v3 | GraphContract store | `commander.py` | add → `work_{id}` | Cross-section node obligations recall | Coarse bucket mapping only |
| v3 | Rich search hits | `supermemory-client.ts` | `searchMemoriesRich` | Score, type badge, customId in cards | Plain `string[]` only |
| v1 | PDF ingest | upload routes | `POST /v3/documents/file` | OCR/chunk PDFs | Disk blobs opaque to agents |
| v1 | User prefs | `POST /api/settings/llm` | add → `user_{id}` | Cross-work style recall | `llm_config.json` is operational, not semantic |
| v1 | Settings bootstrap | `main.py`, web client | `PATCH /v3/settings` | Holocron-specific extraction filter | No PG equivalent |
| fix | Docker env | `docker-compose.yml` | — | `env_file` for agents/web; removed empty `${SUPERMEMORY_API_KEY:-}` override | Compose substitution was clearing keys |

## OpenAPI alignment

Holocron calls map to Supermemory Local OpenAPI (`http://localhost:6767/v4/openapi`):

| Holocron function | HTTP | OpenAPI path |
|-------------------|------|--------------|
| `store_memory` / `storeMemory` | POST | `/v3/documents` |
| `ingestReferencePdf` | POST | `/v3/documents/file` |
| `search_work` / `searchMemories` | POST | `/v4/search` |
| `context_for_work` / `profileForWork` | POST | `/v4/profile` |
| `configure_settings_once` | PATCH | `/v3/settings` |
| `health_status` | GET | `/health` |
| Cursor MCP (local) | — | `/mcp` |

## Redundancy matrix

| Data | Postgres / disk | Supermemory | Intentional? | v2 change |
|------|-----------------|-------------|--------------|-----------|
| Reference analysis | `references_lib.analysis` (full JSON) | Compact summary via `summarizeReferenceAnalysis` | Yes — different roles | Reduced SM payload |
| Generation events | `generation_events` timeline | Full plan/draft/review text | Yes | — |
| PDF files | `STORAGE_PATH` | Chunked index | Yes | `customId: ref_{id}` on ingest |
| LLM config | `llm_config.json` | Preference string | Yes | — |
| Graph | `graph_nodes` / `graph_edges` | Summary snapshot on save | Yes | Added in v2 |
| Work delete | Postgres cascade removes graph + gens | `DELETE /v3/documents/bulk` by `work_{id}` containerTag | Yes | Purges SM on `DELETE /api/works/[workId]` |

## Client strategy

| Runtime | Client | Rationale |
|---------|--------|-----------|
| Python agents | `supermemory` pip SDK ≥3.50 | Profile/search/add typed APIs |
| Next.js web | Raw `fetch` | No npm SDK aligned with Local v0.0.5; server-side only |
| Shared tags | `@holocron/shared` `workTag` / `userTag` | Single source for `containerTag` strings |

## Testing

See [TESTING.md](TESTING.md) for pytest, Vitest, and Playwright commands. Supermemory contract tests mock HTTP; live smoke tests use `curl` against `:6767`.


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
