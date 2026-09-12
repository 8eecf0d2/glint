# Glint site

Minimal single-viewport marketing site built with React 19, TypeScript, Vite 7 and Tailwind 4. It intentionally contains only the Glint identity, hero copy and a single download action linking to GitHub Releases. Run `npm run dev:site` from the repository root. Copy `.env.example` only when preparing a real deployment. The download link is always active and points to `https://github.com/8eecf0d2/glint/releases`. Supported architectures are documented with each release.

The site imports the approved canonical `brand/Glint.icon/Assets/mark.svg`; GLNT-23 is complete.

The background opens with five varied windows floating around the center, then settles into six adjoining regions with one vacancy. Windows periodically move into that vacancy, resizing and translating in one transition to fill their destination on arrival. Each row has its own continuously adjustable width split; nearby rows share height boundaries. Cursor input remains active during moves. Gaps are 10 CSS pixels and corners are 12 CSS pixels. A fixed rounded mesh updates in place during resizing.

The hero stays still. Mouse interaction requires a fine hovering pointer; reduced motion shows a static composition, and hidden tabs suspend animation. Compact screens show two windows. Shared layout constraints preserve minimum sizes and separation while settled; moving windows may cross others during transit. This is illustrative marketing behavior, not an assertion that the native app automatically resizes its neighbors.

Run `node --test applications/glint-site/tests/windowLayout.test.mjs` to check layouts, vacancies and rounded-mesh resizing. The final animation is used in development and production. There are no variation routes or experiment controls.

## Production deployment

The single `.github/workflows/ci.yml` follows Tesse's Nx affected architecture: affected checks/tests, builds, then main-only deployment. Site changes select `glint-site`; shared brand and root dependency changes propagate through Nx. PRs build and dry-run only. The production job downloads the verified Vite artifact and calls `glint-site:deploy` without rebuilding.

The sole Cloudflare Worker serves **glint.broderickwilkinson.com**. No staging, workers.dev or preview URL is enabled. GitHub environment `production` holds `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; credential validity is unverified. Initial deployment requires explicit authorization and `PRODUCTION_DEPLOYS_ENABLED=true`, with `PRODUCTION_DEPLOYS_PAUSED` not true. No deployment occurred during setup.

`npm run check:site:deployment` builds and dry-runs locally. `npm run preview:site:worker` builds then starts local Wrangler. The Nx `check-deployment` and `deploy` targets consume an already built `dist`; use `npm run build` first outside the pipeline. There is no separate manual deploy workflow. See [release operations](../../docs/release.md) for main/full-run gating and the app's independent explicit-version policy.

The existing download link points to this repository's GitHub Releases and becomes public when the owner changes repository visibility at readiness.
