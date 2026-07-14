# Testing Holocron

Holocron uses a three-layer test pyramid: **pytest** (agents), **Vitest** (shared/web/cli libs), and **Playwright** (frontend E2E).

## Quick commands

```bash
# All workspace tests (requires npm ci first)
npm test

# Individual workspaces
npm run test --workspace=@holocron/shared
npm run test --workspace=web
npm run test --workspace=holocron
cd apps/agents && pip install -r requirements.txt -r requirements-dev.txt && pytest

# E2E (stack must be running on :3000)
npm run test:e2e --workspace=web
```

## Test pyramid

```
        Playwright E2E (apps/web/e2e/)
       /                          \
  Vitest (shared, web lib, CLI)   pytest (agents API + supermemory client)
```

## Mock LLM mode

Agents use deterministic responses when `K2THINK_API_KEY=mock-key-for-dev` (default in CI). No real API keys required for unit/integration tests.

## Supermemory in tests

- **Unit tests** mock HTTP or omit `SUPERMEMORY_API_KEY` — memory calls no-op (graceful degradation contract).
- **Live smoke** (manual): see [SUPERMEMORY.md](SUPERMEMORY.md#smoke-test).
- **Never commit** real `sm_...` keys; CI E2E runs with Supermemory disabled or mocked.

## CI jobs

| Workflow | Job | What runs |
|----------|-----|-----------|
| `.github/workflows/ci.yml` | `test-shared`, `test-web`, `test-cli`, `test-agents` | Vitest + pytest |
| `.github/workflows/e2e.yml` | `playwright` | Docker compose + Playwright against `:3000` |

## Local E2E prerequisites

1. `docker compose -f docker/docker-compose.yml up -d postgres agents supermemory latex`
2. `npm run dev --workspace=web` (or full compose including web)
3. `npx playwright install chromium` (first run only)
4. `npm run test:e2e --workspace=web`

## Verification checklist (manual)

After a Supermemory-enabled generation on the same work:

1. Second generation should show planner/writer context influenced by prior plan (check agent logs or `GET /api/works/{workId}/memory/search?q=plan`).
2. Reference analyze with `work_id` stores compact summary retrievable via search.
3. `GET /health` on agents reports `"supermemory":"ok"` when key is configured.
4. Process log shows 30+ events including Supermemory, Planner, Writer, Reviewer entries.
5. `GET /api/works/{workId}/memory/profile` returns static/dynamic profile blocks.

### Live generation scripts

```bash
npm run seed:all -- --force    # Reseed demo works
npm run graph:respread         # Re-space graph nodes
npm run gen:cleanup            # Remove failed generations
npm run gen:live               # Full pipeline via agents API
npm run gen:verify             # Check PDF, word count, bib
npm run gen:backfill-events -- <genId>  # Reconstruct empty process logs
```

Success criteria for `gen:live`: ≥15 events, ≥2500 words, PDF > 50 KB, no placeholder bib.

## Playwright report

After E2E runs, open `apps/web/playwright-report/index.html` for the HTML report.
