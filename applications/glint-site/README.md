# Glint site

Minimal single-viewport marketing site built with React 19, TypeScript, Vite 7 and Tailwind 4. It intentionally contains only the Glint identity, hero copy and a single download action linking to GitHub Releases. Run `npm run dev:site` from the repository root. Copy `.env.example` only when preparing a real deployment. The download link is always active and points to `https://github.com/8eecf0d2/glint/releases`. Supported architectures are documented with each release.

The site imports the approved canonical `brand/Glint.icon/Assets/mark.svg`; GLNT-23 is complete.

The background starts with a gently floating, messy desktop and settles into shared regions. A partition tree owns the space: changing a boundary resizes its neighbors together, including 50/50 → 75/25 pairs and coordinated vertical resizing. The same easing and clock apply to every affected window, so resizing cannot produce overlaps. Settled widths use quarter-screen steps and heights use 20% steps. Quantization applies to the actual screen dimensions, including nested regions, to prevent tiny windows and negligible resize steps. Empty regions and gutters leave breathing room; the desktop has three to five windows across six available anchors.

Relocation reserves an empty destination. If occupied, its owner first relocates to a vacancy; the incoming window follows once the destination is clear. Windows fit within their source before travel and grow within the reserved region after arrival. Transit may cross other windows, while settled frames remain disjoint. Independent relocations can travel together when separate vacancies exist. Opening and closing use vacant regions and never interrupt a layout operation.

This neighbor-aware choreography is an illustrative marketing behavior, not an assertion that the native app automatically resizes other windows. The new drop shadows have been removed. The existing feathered hero blur remains for text legibility. Reduced motion shows a settled composition; resize, tab visibility and preference changes discard pending choreography safely. Mobile uses two vertical regions.

Run `node --test applications/glint-site/tests/windowLayout.test.mjs` from the repository root with Node 22.18+ to verify the layout and relocation invariants.

## Production deployment

The single `.github/workflows/ci.yml` follows Tesse's Nx affected architecture: affected checks/tests, builds, then main-only deployment. Site changes select `glint-site`; shared brand and root dependency changes propagate through Nx. PRs build and dry-run only. The production job downloads the verified Vite artifact and calls `glint-site:deploy` without rebuilding.

The sole Cloudflare Worker serves **glint.broderickwilkinson.com**. No staging, workers.dev or preview URL is enabled. GitHub environment `production` holds `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; credential validity is unverified. Initial deployment requires explicit authorization and `PRODUCTION_DEPLOYS_ENABLED=true`, with `PRODUCTION_DEPLOYS_PAUSED` not true. No deployment occurred during setup.

`npm run check:site:deployment` builds and dry-runs locally. `npm run preview:site:worker` builds then starts local Wrangler. The Nx `check-deployment` and `deploy` targets consume an already built `dist`; use `npm run build` first outside the pipeline. There is no separate manual deploy workflow. See [release operations](../../docs/release.md) for main/full-run gating and the app's independent explicit-version policy.

The existing download link points to this repository's GitHub Releases and becomes public when the owner changes repository visibility at readiness.
