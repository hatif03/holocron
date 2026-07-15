# Cite Smart AI — ideas borrowed into Holocron

Holocron adapts patterns from [Cite Smart AI](https://devpost.com/software/cite-smart-ai) ([frontend](https://github.com/m-azzam-azis/cite-smart-fe), [Modus backend](https://github.com/m-azzam-azis/cite-smart-modus)) without Neo4j or cloud embeddings.

## What we borrowed

| Cite Smart | Holocron equivalent |
|------------|---------------------|
| Research projects (title + keywords) | `research_works` + `start` node (`paper_title`, `keywords`) |
| Semantic Scholar discovery | `POST /api/works/[workId]/discover` |
| Similarity-ranked citations (MiniLM + Neo4j) | Title/keyword token overlap + `metadata.similarityScore` in Supermemory |
| Project citation list UI | **Discover** sidebar tab (`DiscoverPanel.tsx`) |
| Citation Q&A chatbot | **Ask** sidebar tab (`AskPanel.tsx`) + `POST /api/works/[workId]/ask` |
| Neo4j knowledge graph | **Skipped** — IMRaD React Flow graph + Supermemory `work_{id}` |

## What we did not port

- Neo4j graph database or Modus WASM runtime
- MiniLM embedding service (v1 uses lightweight title overlap scoring)
- Cite Smart's full dashboard / graph visualization

## Memory trust UX

User-facing copy says **Memory** (not "Supermemory"). Every read/write can surface a `memoryTrace` field:

- Client ring buffer: `apps/web/src/lib/memory-trace.ts`
- Activity strip: `apps/web/src/components/memory/MemoryActivityStrip.tsx`
- Work activity API: `GET /api/works/[workId]/memory/activity`
- App header health dot from `/api/setup/status`

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/works/[workId]/discover` | Rank Semantic Scholar hits, store `discovered_paper` memories |
| `POST /api/works/[workId]/discover/add` | Add paper to references library; optional literature node |
| `POST /api/works/[workId]/ask` | Profile + search → LLM answer; store `ask` exchanges |
| `GET /api/works/[workId]/memory/activity` | Recent memory types for the work |

## Scoring

`apps/web/src/lib/discover-score.ts` tokenizes work title + keywords vs paper title, adds a small recency boost, and returns 0–1 `similarityScore`.

## Further reading

- [SUPERMEMORY.md](./SUPERMEMORY.md) — integration map and containerTag rules
- `.cursor/rules/supermemory-local.mdc` — agent constraints for local Supermemory
