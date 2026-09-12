# Glint site

Minimal single-viewport marketing site built with React 19, TypeScript, Vite 7 and Tailwind 4. It intentionally contains only the Glint identity, hero copy and a single download action linking to GitHub Releases. Run `npm run dev:site` from the repository root. Copy `.env.example` only when preparing a real deployment. The download link is always active and points to `https://github.com/8eecf0d2/glint/releases`. Supported architectures are documented with each release.

The site imports the approved canonical `brand/Glint.icon/Assets/mark.svg`; GLNT-23 is complete.

The intro begins white, brings in five broad grey app windows in four tones, using overlapping desktop positions with small random offsets and consistent landscape proportions. The logo fades in oversized and accelerates straight into a rigid stop at 1.5 seconds. A single 320ms damped camera kick moves the logo, windows and ambient background together on contact. The windows snap into place after a 55ms impact hold. There is no shadow, perspective tilt, blur, or elastic compression. The motion uses acceleration, opposing reaction and a clear impact hold, informed by [Animation Mentor’s guidance on weight](https://www.animationmentor.com/blog/how-to-create-believable-weight-in-animation/). After a settled hold, the logo drifts up at 3 seconds and content starts arriving at 3.48 seconds. [Paper’s Liquid Metal shader](https://shaders.paper.design/liquid-metal) catches the landing at 45% peak opacity, then continues at 28% opacity and a slower speed after the logo rises. There is no bounce or repeated scale pulse.

The renderer cues the page reveal, with a fallback to keep content accessible if WebGL fails. Paper Shaders 0.0.78 is pinned under Apache-2.0. The logo shader is loaded separately and pauses for reduced motion and hidden tabs; the canonical SVG remains underneath as its fallback.

A separate [Paper Mesh Gradient](https://shaders.paper.design/mesh-gradient) sits behind the windows at 42% opacity, using near-white cool, lilac and warm tones. It fades in after the white opening and drifts slowly with a 350,000-pixel rendering cap; reduced motion freezes it and hidden tabs pause it.

Windows settle into six adjoining regions with one vacancy, then periodically change shared proportions in eighth increments and move into the vacancy. Translation and resizing finish together. Cursor input adjusts nearby widths and shared height boundaries; after it rests, autonomous movement resumes. Gaps are 10 CSS pixels and corners are 12 CSS pixels. A fixed rounded mesh updates in place during resizing.

Reduced motion shows content and a static composition immediately, and hidden tabs suspend rendering. Compact screens show two windows. Moving windows may cross others during transit. This is illustrative marketing behavior, not an assertion that the native app automatically resizes its neighbors.

Run `node --test applications/glint-site/tests/windowLayout.test.mjs` to check layouts, vacancies and rounded-mesh resizing. The final animation is used in development and production. There are no variation routes or experiment controls.

## Production deployment

The single `.github/workflows/ci.yml` follows Tesse's Nx affected architecture: affected checks/tests, builds, then main-only deployment. Site changes select `glint-site`; shared brand and root dependency changes propagate through Nx. PRs build and dry-run only. The production job downloads the verified Vite artifact and calls `glint-site:deploy` without rebuilding.

The sole Cloudflare Worker serves **glint.broderickwilkinson.com**. No staging, workers.dev or preview URL is enabled. GitHub environment `production` holds `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; credential validity is unverified. Initial deployment requires explicit authorization and `PRODUCTION_DEPLOYS_ENABLED=true`, with `PRODUCTION_DEPLOYS_PAUSED` not true. No deployment occurred during setup.

`npm run check:site:deployment` builds and dry-runs locally. `npm run preview:site:worker` builds then starts local Wrangler. The Nx `check-deployment` and `deploy` targets consume an already built `dist`; use `npm run build` first outside the pipeline. There is no separate manual deploy workflow. See [release operations](../../docs/release.md) for main/full-run gating and the app's independent explicit-version policy.

The existing download link points to this repository's GitHub Releases and becomes public when the owner changes repository visibility at readiness.

The download button uses Paper Mesh Gradient in restrained charcoal, slate and muted warm tones, clipped to its rounded background; its label and icon remain solid. It drifts slowly, pauses for reduced motion/hidden tabs, and caps rendering at 80,000 pixels. The headline is plain text. A 140ms contrast accent accompanies the impact shake and returns to normal immediately afterward.
