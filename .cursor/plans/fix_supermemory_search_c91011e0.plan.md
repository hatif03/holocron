---
name: Fix Supermemory Search
overview: "Supermemory stores succeed but search returns 0 hits because documents are added with default `dreaming: \"dynamic\"`, which batches ingestion and delays memory extraction until unrelated documents are grouped. Holocron never waits for indexing and only logs search events when hits are non-empty, making the pipeline look broken even when reads are attempted."
todos:
  - id: instant-dreaming
    content: "Add dreaming: instant to all store paths (agents, web, seed-utils, CLI)"
    status: completed
  - id: wait-searchable
    content: Implement wait_for_searchable helper + shared SEARCH_THRESHOLD (0.3)
    status: completed
  - id: commander-timing
    content: Fix commander search timing, query alignment, emit attempted search events
    status: completed
  - id: web-api-key
    content: Resolve Supermemory API key from env or app_config in web client
    status: completed
  - id: verify-docs
    content: Add diagnose script, tighten verify-showcase-papers, update SUPERMEMORY.md
    status: completed
isProject: false
---

# Fix Supermemory Search Recalls (0 Hits)

## Root cause

```mermaid
sequenceDiagram
  participant Holocron
  participant SM as Supermemory_Local
  Holocron->>SM: POST /v3/documents (dreaming=dynamic default)
  SM-->>Holocron: 200 OK document queued
  Holocron->>SM: POST /v4/search
  SM-->>Holocron: results=[] (memories not extracted yet)
  Note over SM: Dynamic dreaming batches docs;<br/>memories form later in coherent groups
  Holocron->>SM: POST /v3/documents (more stores)
  Note over Holocron: Emits store events always;<br/>search events only if hits > 0
```

Evidence from codebase + [Supermemory processing modes](https://supermemory.ai/docs/add-memories#processing-modes):

- **No `dreaming` parameter anywhere** in Holocron — all writes use SDK/HTTP defaults (`"dynamic"`).
- **Search runs immediately after store** in [`commander.py`](apps/agents/src/orchestrator/commander.py) (section draft → store → next section searches prior draft within seconds).
- **Second renewables generation still had 0 search hits** — run-1 section stores never became searchable memories before run-2.
- **Profile also empty** — profile/searchResults depend on extracted memories, same pipeline.
- **Observability gap** — [`_emit_memory`](apps/agents/src/orchestrator/commander.py) only emits `action: "search"` when `section_hits` / `prior_hits` are non-empty, so the recalls API shows 19 `store` events and zero `search` events even when search was attempted.

Secondary issues (fix while here):

| Issue | Impact |
|-------|--------|
| Web search threshold `0.6` vs agents `0.4` | Web Memory tab stricter than pipeline |
| Search failures logged at `debug` | Silent empty results mask auth/API errors |
| Web reads `SUPERMEMORY_API_KEY` from env only | Graph-save writes may no-op if key only in settings UI |
| Seed scripts don't wait for indexing | `seedRecallMemories` returns after HTTP 200, not after searchable |

Endpoints and `containerTag` (`work_{workId}`) are **correct** — not the bug.

---

## Fix strategy

### 1. Instant dreaming on all writes

Add `"dreaming": "instant"` to every document write so each store is processed into searchable memories immediately.

**Files:**

- [`apps/agents/src/supermemory_client.py`](apps/agents/src/supermemory_client.py) — `store_memory()` → `client.add(..., dreaming="instant")`
- [`apps/web/src/lib/supermemory-client.ts`](apps/web/src/lib/supermemory-client.ts) — `storeMemory()` JSON body
- [`scripts/seed-utils.mjs`](scripts/seed-utils.mjs) — `seedRecallMemories()` and `ingestGraphMemory()`
- [`packages/cli/src/supermemory.ts`](packages/cli/src/supermemory.ts) if it has direct document POSTs

### 2. Shared search threshold + indexing wait helper

Add to [`packages/shared/src/constants.ts`](packages/shared/src/constants.ts):

```ts
export const SUPERMEMORY_SEARCH_THRESHOLD = 0.3; // permissive for local demo
```

Add indexing utilities:

**Agents** — extend [`supermemory_client.py`](apps/agents/src/supermemory_client.py):

- `store_memory()` returns document `id` from add response
- `wait_for_searchable(work_id, query, *, timeout_s=30, interval_s=1)` — poll `POST /v4/search` (or `GET /v3/documents/{id}` until `status === "done"`) until ≥1 hit or timeout
- Use shared threshold constant (duplicate in Python as `0.3`)
- Upgrade search/store failures from `logger.debug` → `logger.warning` with status/body snippet

**Scripts** — add `waitForSearchable(workId, query)` in [`scripts/seed-utils.mjs`](scripts/seed-utils.mjs); call after `seedRecallMemories()` in [`seed-recall-demo.mjs`](scripts/seed-recall-demo.mjs) and [`seed-showcase-renewables.mjs`](scripts/seed-showcase-renewables.mjs).

**Web** — use `SUPERMEMORY_SEARCH_THRESHOLD` in [`supermemory-client.ts`](apps/web/src/lib/supermemory-client.ts) (replace hardcoded `0.6`).

### 3. Commander recall timing

In [`commander.py`](apps/agents/src/orchestrator/commander.py):

- After each section `store_memory(...)` for writer output, call `wait_for_searchable(work_id, f"section: {name}", timeout_s=15)` before the next section begins (cheap no-op if already indexed).
- Align prior-draft search query with stored format: search `f"section: {prior_name}"` (matches store prefix `section: {name}\n{content}`).
- Emit **attempted** search events even when hits are empty (`recalledCount: 0`, optional `attempted: true`) so the Memory timeline shows read activity during demo.
- After storing review feedback inside the review loop, `wait_for_searchable` before re-searching (fixes same-run review recall).

Initial `context_for_work` at pipeline start can stay as-is; per-section refresh already re-calls profile.

### 4. Web API key from app config (if missing in env)

In [`apps/web/src/lib/supermemory-client.ts`](apps/web/src/lib/supermemory-client.ts), resolve API key from env **or** [`app-config`](apps/web/src/lib/app-config.ts) `supermemoryApiKey` (same pattern as setup status route). Ensures graph-save and Memory tab writes/search work when key is configured via Settings UI.

### 5. Verification + docs

- Add [`scripts/diagnose-supermemory-search.mjs`](scripts/diagnose-supermemory-search.mjs): seed one doc with `dreaming: instant`, poll search, print hit count + sample — fast local smoke test.
- Tighten [`scripts/verify-showcase-papers.mjs`](scripts/verify-showcase-papers.mjs): **FAIL** (not WARN) when `search recalls with hits === 0` after fix.
- Update [`docs/SUPERMEMORY.md`](docs/SUPERMEMORY.md): document `dreaming: instant`, indexing wait, and that search events appear in recalls timeline.

**Verification commands (after implementation):**

```bash
npm run stop:all && npm run start:local
node scripts/seed-recall-demo.mjs
node scripts/diagnose-supermemory-search.mjs
npm run verify:supermemory
node scripts/verify-showcase-papers.mjs
# Optional: one new renewables generation to confirm cross-run prior-draft recall
```

Success criteria:

- Direct `POST /v4/search` on a seeded work returns ≥1 hit within 30s
- Showcase generations show ≥1 `search` recall event with `recalledCount > 0`
- Renewables Memory tab in research graph shows pre-seeded hits

---

## Risk / scope notes

- `dreaming: "instant"` bills one extra operation per document per Supermemory docs — acceptable for local demo; document in SUPERMEMORY.md.
- Existing documents ingested under `dynamic` may remain unsearchable until re-seeded; verification should re-run `seed-recall-demo.mjs` after deploy.
- No plan file edits; no npm publish in this fix.
