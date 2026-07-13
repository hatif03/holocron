---
name: supermemory-local
description: Integrates Supermemory Local (localhost:6767) into Holocron for the hackathon. Use when adding persistent memory, semantic search, user profiles, containerTag scoping, or Supermemory SDK/API integration in agents or web. Covers Docker setup, canonical API surface, and Holocron-specific hook points.
---

# Supermemory Local for Holocron

Supermemory Local runs at `http://localhost:6767` via Docker on Windows. Use the local server — not `api.supermemory.ai` — for hackathon work.

## Quick reference

| Task | Action |
|------|--------|
| Start server | `.\docker\supermemory\bootstrap.ps1` or see [docs/SUPERMEMORY.md](../../docs/SUPERMEMORY.md) |
| Env vars | `SUPERMEMORY_API_URL`, `SUPERMEMORY_API_KEY` in `.env` |
| Docs MCP | `.cursor/mcp.json` — search Supermemory docs in Cursor |
| Canonical API | [references/canonical-api.md](references/canonical-api.md) |
| Holocron hooks | [references/holocron-integration.md](references/holocron-integration.md) |

## Integration workflow

1. **Configure settings first** — `PATCH /v3/settings` with Holocron `filterPrompt` (see holocron-integration.md)
2. **Always scope with `containerTag`** — singular string in JSON body, never omitted
3. **Retrieve context** — `client.profile({ containerTag, q })` before LLM calls (recommended)
4. **Store after interactions** — `client.add({ content, containerTag })`
5. **Search** — `client.search.memories({ q, containerTag, searchMode: "hybrid" })`

## SDK setup (when integrating code)

```bash
# Web
npm install supermemory --workspace=web

# Agents
pip install supermemory
```

```typescript
import Supermemory from "supermemory"

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY!,
  baseURL: process.env.SUPERMEMORY_API_URL ?? "http://localhost:6767",
})
```

```python
from supermemory import Supermemory
import os

client = Supermemory(
    api_key=os.environ["SUPERMEMORY_API_KEY"],
    base_url=os.environ.get("SUPERMEMORY_API_URL", "http://localhost:6767"),
)
```

## containerTag strategy

| Scope | containerTag | Use |
|-------|-------------|-----|
| Research work | `work_{workId}` | Paper context, references, generations |
| User | `user_{userId}` | Cross-project preferences |
| Generation run | metadata `{ generationId, workId }` | Filter within a work |

## Common mistakes

- Omitting `containerTag` — collapses all data into one bucket
- Using deprecated endpoints (`/v3/search`, `/v3/memories`, `/v1/*`)
- Wrong auth header (`x-api-key` instead of `Authorization: Bearer`)
- Pointing at cloud API instead of `http://localhost:6767`

## Additional resources

- [canonical-api.md](references/canonical-api.md) — endpoints and SDK methods to use/avoid
- [holocron-integration.md](references/holocron-integration.md) — where to wire memory in this repo
- [Supermemory docs](https://supermemory.ai/docs) — use MCP `search_supermemory_memory_api_for` for lookups
