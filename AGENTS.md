# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js, port 3000)
npm run build    # Production build
npm run start    # Start production server
```

No test suite. No linter configured.

## Architecture

**AI Literacy Workshop** — an interactive storytelling platform where users explore AI use cases via an animated p5.js canvas of floating orbs.

Two routes:
- `/` — Home page: shell UI + the `OrbsSketch` interactive canvas
- `/org` — Organization dashboard: moderation UI for reviewing/approving story submissions

### Key files

- [app/components/OrbsSketch.tsx](app/components/OrbsSketch.tsx) — The entire canvas experience (~660 lines). Contains the p5.js sketch, physics simulation, watercolor rendering, flow field, view filtering, and the multi-step share form. This is the heart of the project.
- [app/page.tsx](app/page.tsx) — Home page shell. Dynamically imports `OrbsSketch` with `ssr: false` (p5.js requires DOM).
- [app/org/page.tsx](app/org/page.tsx) — Org dashboard. Fully client-side with inline styles.
- [app/globals.css](app/globals.css) — All shared CSS. No CSS framework — plain CSS with flexbox/grid.

### OrbsSketch internals

The sketch runs a custom physics simulation:
- **Ball class** — each story becomes an orb with velocity, damping, boundary collisions
- **Watercolor rendering** — procedural polygon growth creates organic blob effects on each orb
- **Flow field** — Perlin-like noise guides orb movement in freeform mode
- **Interaction modes** — `freeform` (flowing), `transitioning`, `grid` (organized layout for reading)
- **View filtering** — 5 views (All / Clinical Care / Research / Productivity / Personal) fade orbs in/out by category
- **Story data** — 15 hardcoded stories in the component; placeholders fill up to the configured count

DialKit (a live parameter control panel) is wired to the dot count slider.

### Styling conventions

- Background: `#EDE7D8` (warm parchment)
- Text: `#1e1810` (dark brown)
- Font: "Cactus Classical Serif" (Google Fonts) + SF Mono for code
- All component-level CSS lives in inline `<style>` tags inside the component; shared styles go in `globals.css`
- No Tailwind, no CSS modules

### Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| UI | React 19, plain CSS |
| Canvas | p5.js 1.9.4 |
| Animation | Motion 12 (minor use) |
| Controls | DialKit 1.2.0 |
| Language | TypeScript (strict) |

No backend, no database, no external API calls — fully client-side with static data.
