# Holocron Demo Video Script

Step-by-step flow for recording a demo of Supermemory **reads and writes** during paper generation.

## Prerequisites

```bash
npm run stop:all && npm run start:local
npm run seed:showcase
npm run seed:showcase:renewables
npm run seed:recall:demo
```

Ensure K2 Think (or another LLM) is configured in **Settings** — mock mode produces placeholder papers.

## Act 1 — Renewables showcase + pre-seeded memory

1. Open **Research Graph** → select *Renewable Electricity Share and Fossil Fuel Dependence…*
2. Sidebar **Memory** tab → search `energy transition` — show pre-seeded hits (intro draft, VLM note, graph summary)
3. Note the warm **WhatsApp** green theme on nav and sidebar

## Act 2 — First paper generation

1. Click **Generate Paper** on the `end` node
2. Open **Paper Generation** → click the running task
3. Expand **Memory trace** — show timeline:
   - `Profile` at start (work + user context)
   - `Recall` before each section (`search` with hit count)
   - `Store` after planner, contract, each section
4. When complete, open **PDF** — verify figures (bar chart, histogram), readable Methods, resolved citations

## Act 3 — Second generation (cross-run recall)

1. Return to the same renewables work → **Generate Paper** again
2. On the new generation detail page, expand Memory trace
3. Highlight **Introduction** / **Methods** recall events — prior section drafts from Run 1 appear in search hits
4. Compare Process Log Supermemory events with the timeline

## Act 4 — OWID climate paper

1. Open the OWID CO₂ / life expectancy showcase work
2. Generate paper (or open completed generation from `npm run gen:showcase "CO₂"`)
3. Show image preview in Explorer (click PNG in Figures)
4. Scroll the detail page — all three panels reachable

## Act 5 — Settings + CLI

1. **Settings** → Supermemory health green, LLM provider configured
2. Terminal: `npx holocron-research@1.0.4 status`
3. Terminal: `npm run verify:showcase`

## Verification commands

```bash
npm run verify:supermemory
npm run verify:showcase
npm run gen:verify <generation-id>
```

Expected: both showcase generations `completed*`, memory trace ≥5 events, search recalls with hits on renewables second run.
