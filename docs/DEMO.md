# Holocron Demo Video Script

**Published demo:** [YouTube — Holocron walkthrough](https://youtu.be/5Vnh6s4N_Z4)

Technical checklist for recording. For the spoken voiceover, see **[DEMO_NARRATION.md](./DEMO_NARRATION.md)**.

## Prerequisites

```bash
npm run stop:all && npm run start:local
npm run seed:showcase
npm run seed:showcase:renewables
npm run seed:recall:demo
npm run diagnose:supermemory
```

Ensure K2 Think (or another LLM) is configured in **Settings** — mock mode produces placeholder papers.

## Act 1 — Renewables showcase + pre-seeded memory

1. Open **Research Graph** → select *Renewable Electricity Share and Fossil Fuel Dependence…*
2. Sidebar **Memory** tab → search `energy transition` — show pre-seeded hits (intro draft, VLM note, graph summary)
3. Note the Holocron green UI and **Instrument Serif** logo wordmark

## Act 2 — First paper generation

1. Click **Generate Paper** on the `end` node (or open completed generation below)
2. Open **Paper Generation** → detail page
3. Expand **Memory trace** — show timeline:
   - `Profile` at start (work + user context)
   - `Recall` before each section (`search` with `recalledCount > 0`)
   - `Store` after planner, contract, each section
4. Scroll **Process Log**, **Explorer**, and **PDF** independently (fixed header + memory bar)
5. When complete, verify PDF — figures, Methods, citations

**Working demo URL:** http://localhost:3000/paper-generation/4d9df851-1f58-4f46-820b-ab6da3d5e28b (70 search recalls)

## Act 3 — Second generation (cross-run recall)

1. Return to the same renewables work → **Generate Paper** again
2. On the new generation detail page, expand Memory trace
3. Highlight **Introduction** / **Methods** recall events — prior section drafts from Run 1

## Act 4 — OWID climate paper (capability showcase)

1. Open the OWID CO₂ / life expectancy showcase work
2. Open completed generation — figures, Methods code, CSV-backed charts
3. Show image preview in Explorer (click PNG in Figures)
4. Expand Memory trace — search recalls with hits

**Working demo URL:** http://localhost:3000/paper-generation/7189879b-9f93-47ed-9634-79e48737db9c (70 search recalls, regenerated with LaTeX fixes)

## Act 5 — References + Settings + CLI

1. **References** → add/analyze a paper — show extracted summary in Supermemory
2. **Settings** → Supermemory health green, LLM provider configured
3. Terminal: `npx holocron-research@1.0.5 status`

## Verification commands

```bash
npm run diagnose:supermemory
node scripts/verify-showcase-papers.mjs
npm run gen:verify <generation-id>
```

Expected: **two** showcase generations (renewables + OWID), each with `search recalls with hits > 0`; diagnose script PASS.

### Public install smoke test

```bash
npx holocron-research@1.0.6 doctor
npx holocron-research@1.0.6 start
npm run seed:showcase && npm run seed:showcase:renewables && npm run seed:recall:demo
node scripts/verify-showcase-papers.mjs
```
