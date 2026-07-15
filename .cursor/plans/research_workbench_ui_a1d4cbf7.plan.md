---
name: Research Workbench UI
overview: "Replace the Star Wars theme with a professional Research Workbench design: neutral dark/light surfaces, single blue accent, Inter + JetBrains Mono typography, semantic graph colors, and restrained motion—aligned with Elicit/Linear/Obsidian-style research tools."
todos:
  - id: tokens-fonts
    content: Rewrite globals.css tokens; swap Inter + JetBrains Mono in layout.tsx; remove SW animations/assets
    status: completed
  - id: ui-components
    content: Refactor ui.tsx, theme-toggle, Button/Badge/Dialog variants to Research Workbench style
    status: completed
  - id: pages-copy
    content: Update home, navbar, and all page headers; remove crawl/starfield/themed subtitles
    status: completed
  - id: graph-nodes
    content: Restore semantic category colors in nodes.tsx and node-field-schemas.ts
    status: completed
  - id: generation-ui
    content: Replace thinking-glow/holocron-pulse in ProcessLogPanel and GenerationHeader
    status: completed
  - id: docs-verify
    content: Update README docs; grep cleanup; typecheck and visual verification pass
    status: completed
isProject: false
---

# Switch Holocron to Research Workbench UI

## Direction (locked)

**Research Workbench** — a scholarly IDE aesthetic inspired by [Elicit](https://elicit.com/), [Linear](https://linear.app/), and Obsidian-style knowledge graphs: trustworthy, data-dense, calm for long sessions. Not themed fiction.

| Aspect | Remove (Star Wars) | Adopt (Research Workbench) |
|--------|-------------------|----------------------------|
| Primary accent | Crimson `#C41E3A` + red glow shadows | Deep blue `#2563EB` (dark) / `#1D4ED8` (light) |
| Display color | Crawl yellow titles | Foreground hierarchy via size/weight, not gold |
| Secondary accent | Cyan everywhere | Muted `--color-muted-foreground` + blue for links/actions only |
| Fonts | Orbitron + Exo 2 | **Inter** (UI) + **JetBrains Mono** (logs, code, BibTeX) |
| Background | Starfield, red lattice grid, gradients | Flat neutral surfaces; optional subtle 1px grid at 3% opacity |
| Motion | Logo pulse, crimson thinking-glow, crawl teaser | Single `page-enter` fade; spinner for active generation |
| Copy | "Archives", "crew", "lattice", crawl text | Plain functional labels |
| Logo | Large pulsing hero | Small navbar mark only; hero uses wordmark + one-line value prop |
| Corners | Sharp `rounded-sm`, clip-path panels | Standard `rounded-lg` cards (matches most research SaaS) |

Keep the **Holocron** product name and [`holocron.png`](apps/web/public/holocron.png) as a neutral brand mark (no glow animation).

---

## Design tokens

Rewrite [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css):

```css
/* Dark (default) */
--color-background: #0f1117;      /* slate-950-ish, not pure black */
--color-card: #181b24;
--color-primary: #2563eb;         /* blue-600 */
--color-muted: #1e2230;
--color-border: #2a3040;

/* Light */
--color-background: #fafafa;
--color-card: #ffffff;
--color-primary: #1d4ed8;
```

Add semantic tokens (replace ad-hoc `accent-yellow` / `accent-cyan`):

- `--color-success`, `--color-warning`, `--color-info` for badges and status
- `--font-mono` for agent logs and code blocks

**Remove entirely:** `.starfield`, `.holocron-pulse`, `.thinking-glow`, `.holocron-panel`, `@keyframes star-drift`, red-tinted `.hero-grid`.

**Keep:** `.page-enter` (shortened to ~250ms).

---

## Typography

Update [`apps/web/src/app/layout.tsx`](apps/web/src/app/layout.tsx):

- Replace `Orbitron` / `Exo_2` with `Inter` + `JetBrains_Mono` via `next/font/google`
- Map `--font-body` → Inter, `--font-mono` → JetBrains Mono
- Remove `font-display` as a separate sci-fi role; page titles use `font-semibold text-2xl tracking-tight`

---

## Component library

Refactor [`apps/web/src/components/ui.tsx`](apps/web/src/components/ui.tsx):

- **Button:** Remove `gradient` and `cyan` variants; use `default` (blue primary), `outline`, `ghost`, `secondary` (muted fill)
- Remove crimson box-shadows from primary buttons
- **Badge:** Replace `yellow`/`cyan` variants with `success`, `warning`, `info`, `default`
- **Dialog:** Title uses `text-foreground font-semibold`, not yellow display font
- **Card:** `rounded-lg`, subtle border, no red tint in shadow

Update [`apps/web/src/components/theme-toggle.tsx`](apps/web/src/components/theme-toggle.tsx) to use `primary` / `muted-foreground` instead of yellow/cyan icons.

---

## Page surfaces (8 files)

Apply consistent page header pattern across all routes:

```tsx
<h1 className="text-2xl font-semibold tracking-tight">Research Graph</h1>
<p className="text-sm text-muted-foreground mt-1">Optional one-line description</p>
```

| File | Changes |
|------|---------|
| [`apps/web/src/app/page.tsx`](apps/web/src/app/page.tsx) | Remove crawl teaser, starfield, pulse; clean hero with logo (static, ~64px), headline, 3 CTAs |
| [`apps/web/src/components/navbar.tsx`](apps/web/src/components/navbar.tsx) | Wordmark in `text-foreground font-semibold`; active nav uses `bg-primary/10 text-primary` |
| [`apps/web/src/app/research-graph/page.tsx`](apps/web/src/app/research-graph/page.tsx) | Neutral headers; subtitle: "Visual map of your research" |
| [`apps/web/src/app/paper-generation/page.tsx`](apps/web/src/app/paper-generation/page.tsx) | Subtitle: "Multi-agent paper pipeline" |
| [`apps/web/src/app/references/page.tsx`](apps/web/src/app/references/page.tsx) | Remove "The Archives"; subtitle: "Papers and BibTeX library" |
| [`apps/web/src/app/agents/page.tsx`](apps/web/src/app/agents/page.tsx) | Subtitle: "Service status" |
| [`apps/web/src/app/settings/page.tsx`](apps/web/src/app/settings/page.tsx) | Subtitle: "LLM provider and API keys" |
| [`GenerationHeader.tsx`](apps/web/src/components/paper-generation/detail/GenerationHeader.tsx) | Standard title styling |

---

## Graph node semantics

Restore **category-meaning colors** (not Star Wars accents) in [`apps/web/src/components/research-graph/nodes.tsx`](apps/web/src/components/research-graph/nodes.tsx) and [`packages/shared/src/node-field-schemas.ts`](packages/shared/src/node-field-schemas.ts):

| Category | Border / background |
|----------|---------------------|
| Control (start/end/paper_section) | violet |
| Ideation (idea/question/hypothesis) | amber |
| Knowledge (literature/concept) | blue |
| Execution (method/experiment/metric/data) | emerald |
| Evidence (result/finding/figure/table) | orange |

Use `/10` opacity backgrounds and `/40` borders for dark-mode readability (same pattern as pre-remaster, without SW token names).

---

## Generation / agent UI

[`ProcessLogPanel.tsx`](apps/web/src/components/paper-generation/detail/ProcessLogPanel.tsx):

- Replace `thinking-glow` + `holocron-pulse` block with a simple `Loader2` spin icon + "Waiting for agent activity…"
- Panel title: normal `font-medium text-sm`, not uppercase yellow

---

## Assets and cleanup

- **Keep** [`holocron.png`](apps/web/public/holocron.png) for favicon and navbar
- **Delete** unused [`ornament-corner.svg`](apps/web/public/ornament-corner.svg) (Star Wars decorative asset)
- Grep for remaining `accent-yellow`, `accent-cyan`, `font-display`, `holocron-pulse` and remove

---

## Documentation

Update theme descriptions (remove "Star Wars–inspired"):

- [`README.md`](README.md) — describe Research Workbench positioning
- [`apps/web/README.md`](apps/web/README.md) — Inter + JetBrains Mono, token table
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — one line on UI philosophy if mentioned

No changes to agents, BYOK, or CLI logic.

---

## Verification

After implementation:

1. `npx tsc --noEmit` in `apps/web`
2. Visual pass: Home, Research Graph canvas, Paper Generation detail (running state), Settings, light/dark toggle
3. Confirm graph node categories remain distinguishable in both themes
4. Confirm no remaining Star Wars copy or crimson/yellow dominance

```mermaid
flowchart TB
  subgraph tokens [Design Tokens]
    globals["globals.css"]
    layout["layout.tsx fonts"]
  end
  subgraph components [Components]
    ui["ui.tsx"]
    navbar["navbar.tsx"]
    nodes["nodes.tsx"]
  end
  subgraph pages [Pages]
    home["page.tsx"]
    routes["5 route headers"]
    log["ProcessLogPanel"]
  end
  globals --> ui
  globals --> pages
  layout --> pages
  ui --> components
  nodes --> graph["Research Graph"]
```

---

## Out of scope

- Docker web production build fix (`@holocron/shared` resolution)
- New features or layout restructuring (three-panel generation UI stays as-is)
- Replacing the holocron logo artwork itself
