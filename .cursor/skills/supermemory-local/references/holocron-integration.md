# Holocron + Supermemory Local Integration

## Architecture fit

Holocron persists structured data in Postgres and files. Supermemory adds **semantic memory** — extracted facts, user profiles, and hybrid search across ingested content. Use both: Postgres for CRUD, Supermemory for agent context.

```
Browser → Next.js /api/* → FastAPI agents → LLM (K2 Think)
                ↓                    ↓
           Postgres            Supermemory Local :6767
           STORAGE_PATH
```

## containerTag conventions

| Tag | When |
|-----|------|
| `work_{workId}` | Default for a research work — references, planner output, writer drafts |
| `user_{userId}` | User preferences across works (local auth uses seeded `LOCAL_USER`) |
| metadata `{ type, generationId, workId }` | Secondary filtering within a work |

Prefer `work_{workId}` for hackathon features tied to the research graph.

## One-time settings

Run after first boot (API key in `.env`):

```bash
curl -X PATCH http://localhost:6767/v3/settings \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "shouldLLMFilter": true,
    "filterPrompt": "This is Holocron, a research paper generation app. containerTag is work_{workId} or user_{userId}. We store research context, literature references, agent planner/writer/reviewer outputs, and user preferences for academic writing."
  }'
```

## Integration hook points

### Python agents (primary)

| File | Hook |
|------|------|
| [`apps/agents/src/orchestrator/commander.py`](../../../apps/agents/src/orchestrator/commander.py) | `profile()` before pipeline; `add()` after each agent turn |
| [`apps/agents/src/agents/planner.py`](../../../apps/agents/src/agents/planner.py) | Store Semantic Scholar findings + plan as documents |
| [`apps/agents/src/agents/writer.py`](../../../apps/agents/src/agents/writer.py) | Retrieve relevant memories before drafting sections |
| [`apps/agents/src/agents/reviewer.py`](../../../apps/agents/src/agents/reviewer.py) | Store review feedback for iterative improvement |
| [`apps/agents/src/config.py`](../../../apps/agents/src/config.py) | Add `supermemory_api_url`, `supermemory_api_key` to Settings |

Suggested Python helper (`apps/agents/src/supermemory_client.py`):

```python
from supermemory import Supermemory
from .config import settings

def get_client() -> Supermemory:
    return Supermemory(
        api_key=settings.supermemory_api_key,
        base_url=settings.supermemory_api_url or "http://localhost:6767",
    )

async def context_for_work(work_id: str, query: str) -> str:
    client = get_client()
    result = client.profile(container_tag=f"work_{work_id}", q=query)
    static = "\n".join(result.profile.static)
    dynamic = "\n".join(result.profile.dynamic)
    memories = ""
    if result.search_results:
        memories = "\n".join(r.memory for r in result.search_results.results if r.memory)
    return f"Static:\n{static}\n\nDynamic:\n{dynamic}\n\nMemories:\n{memories}"
```

When running agents in Docker, use `SUPERMEMORY_API_URL=http://host.docker.internal:6767` so the container reaches the host-mapped port.

### Next.js web

| File | Hook |
|------|------|
| [`apps/web/src/lib/`](../../../apps/web/src/lib/) | New `supermemory-client.ts` — thin SDK wrapper |
| [`apps/web/src/app/api/references/`](../../../apps/web/src/app/api/references/) | Ingest reference PDFs via `/v3/documents/file` |
| [`apps/web/src/app/api/generations/`](../../../apps/web/src/app/api/generations/) | Store generation summaries after completion |

### Reference PDF ingestion

When a reference PDF is analyzed, also send to Supermemory:

```typescript
const formData = new FormData()
formData.append("file", pdfBlob)
formData.append("containerTag", `work_${workId}`)
formData.append("metadata", JSON.stringify({ type: "reference", referenceId }))

await fetch(`${process.env.SUPERMEMORY_API_URL}/v3/documents/file`, {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}` },
  body: formData,
})
```

## Hackathon feature ideas

- **Memory-aware paper generation** — planner/writer recall prior works and user style
- **Reference second brain** — semantic search across uploaded PDFs per work
- **Cross-session agent memory** — reviewer learns from past generation feedback
- **Research graph context** — ingest node/edge summaries as documents

## Docker networking

| Context | SUPERMEMORY_API_URL |
|---------|---------------------|
| Host / Cursor | `http://localhost:6767` |
| Holocron agents container | `http://host.docker.internal:6767` |
| Holocron web container | `http://host.docker.internal:6767` |

Add to `docker-compose.yml` agent/web services when integrating:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
environment:
  SUPERMEMORY_API_URL: http://host.docker.internal:6767
  SUPERMEMORY_API_KEY: ${SUPERMEMORY_API_KEY}
```

## LLM for extraction

Supermemory Docker service uses K2 Think via `OPENAI_*` env mapping. Ensure `K2THINK_API_KEY` is a real key (not `mock-key-for-dev`) for memory extraction to work.
