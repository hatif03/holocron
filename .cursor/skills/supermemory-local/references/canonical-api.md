# Canonical Supermemory API Surface

From [vibe-coding setup](https://supermemory.ai/docs/vibe-coding). Use these only — AI-generated integrations often hallucinate deprecated endpoints.

## Local server

```typescript
const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY!,
  baseURL: process.env.SUPERMEMORY_API_URL ?? "http://localhost:6767",
})
```

## Auth

```
Authorization: Bearer $SUPERMEMORY_API_KEY
```

Only supported auth header. No `x-supermemory-api-key`, `x-api-key`, `x-sm-user-id`, etc.

## Endpoints

| Operation | Method | Path |
|-----------|--------|------|
| Write content | POST | `/v3/documents` |
| Upload file | POST | `/v3/documents/file` |
| Search | POST | `/v4/search` |
| Profile + search | POST | `/v4/profile` |
| Settings | PATCH | `/v3/settings` |

## Scoping

`containerTag` — **singular string** in the JSON body. Never in a header. Never `containerTags` (plural array).

```json
{
  "content": "...",
  "containerTag": "work_abc123"
}
```

## SDK methods

| Use | Avoid |
|-----|-------|
| `client.add()` | `client.documents.add` as primary write |
| `client.search.memories()` | `client.search.execute` |
| `client.profile()` | Fabricated profile methods |
| `client.memories.update()` | Only for user-facing memory management UIs |
| `client.memories.delete()` | Same |
| `client.memories.forget()` | Same |

## Search parameters

```typescript
await client.search.memories({
  q: "query",
  containerTag: "work_abc",
  searchMode: "hybrid",  // recommended: memories + document chunks
  limit: 5,
})
```

v4-only options (never on v3): `rerank`, `rewriteQuery`, `filters`

## Profile

```typescript
// Option A: profile + search in one call
const { profile, searchResults } = await client.profile({
  containerTag: "work_abc",
  q: userMessage,
})

// Option B: profile only
const { profile } = await client.profile({
  containerTag: "work_abc",
})
```

## Settings (configure first)

```typescript
await fetch(`${baseURL}/v3/settings`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    shouldLLMFilter: true,
    filterPrompt: "This is Holocron... containerTag is work_{workId}...",
  }),
})
```

## File uploads

```typescript
const formData = new FormData()
formData.append("file", fileBlob)
formData.append("containerTag", "work_abc")

await fetch(`${baseURL}/v3/documents/file`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: formData,
})
```

Processing is async — check `GET /v3/documents/{documentId}` before assuming searchable.

## DO NOT USE

**Endpoints:** `/v1/*`, `/v3/memories`, `/v3/search`

**Headers:** `x-supermemory-api-key`, `x-api-key`, `x-sm-user-id`, `x-sm-project`, `x-project-id`, `X-Workspace-Id`

**Body keys:** `containerTags`, `userId`, `spaces`, `schema`, `container`, top-level `tags`, singular `filter`

**SDK kwargs:** `chunk_threshold` (use `threshold`), `sort`, `order`, `include_content`, `include_full_docs`, `timeout` as SDK kwarg

## Direct API examples

```bash
# Add
curl -X POST http://localhost:6767/v3/documents \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"...", "containerTag":"work_abc"}'

# Search
curl -X POST http://localhost:6767/v4/search \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q":"query", "containerTag":"work_abc", "searchMode":"hybrid"}'

# Profile
curl -X POST http://localhost:6767/v4/profile \
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"containerTag":"work_abc", "q":"user question"}'
```
