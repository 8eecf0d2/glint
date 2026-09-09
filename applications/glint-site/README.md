# Glint site

Minimal single-viewport marketing site built with React 19, TypeScript, Vite 7 and Tailwind 4. It intentionally contains only the Glint identity, hero copy and a single download action linking to GitHub Releases. Run `npm run dev:site` from the repository root. Copy `.env.example` only when preparing a real deployment. The download link is always active and points to `https://github.com/8eecf0d2/glint/releases`. Supported architectures are documented with each release.

The site imports the approved canonical `brand/Glint.icon/Assets/mark.svg`; GLNT-23 is complete.

The background starts with a gently floating, messy desktop and settles into shared regions. A partition tree owns the space: changing a boundary resizes its neighbors together, including 50/50 → 75/25 pairs and coordinated vertical resizing. The same easing and clock apply to every affected window, so resizing cannot produce overlaps. Settled widths use quarter-screen steps and heights use 20% steps. Quantization applies to the actual screen dimensions, including nested regions, to prevent tiny windows and negligible resize steps. Empty regions and gutters leave breathing room; the desktop has three to five windows across six available anchors.

Relocation reserves an empty destination. If occupied, its owner first relocates to a vacancy; the incoming window follows once the destination is clear. Windows fit within their source before travel and grow within the reserved region after arrival. Transit may cross other windows, while settled frames remain disjoint. Independent relocations can travel together when separate vacancies exist. Opening and closing use vacant regions and never interrupt a layout operation.

This neighbor-aware choreography is an illustrative marketing behavior, not an assertion that the native app automatically resizes other windows. The new drop shadows have been removed. The existing feathered hero blur remains for text legibility. Reduced motion shows a settled composition; resize, tab visibility and preference changes discard pending choreography safely. Mobile uses two vertical regions.

Run `node --test applications/glint-site/tests/windowLayout.test.mjs` from the repository root with Node 22.18+ to verify the layout and relocation invariants.

## Cloudflare deployment

Production is configured for **glint.broderickwilkinson.com**, verified against the personal site's `broderickwilkinson/wrangler.jsonc`. The site uses Cloudflare Workers Static Assets to serve only Vite's `dist` directory; there is no server entry point or native app upload. Wrangler builds fresh assets before preview, validation and deployment. There is exactly one deployment, using Wrangler 4 for static asset support.

From the repository root:

- `npm run dev:site` — existing Vite development server.
- `npm run preview:site:worker` — local Wrangler preview on port 8787.
- `npm run check:site:deployment` — production build and Wrangler dry run; does not upload or change DNS.
- `npm run deploy:site` — publishes `glint-site-production` and attaches the configured custom domain.

Authenticate locally with `npx wrangler login`, or supply `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Use the account hosting the active `broderickwilkinson.com` zone. The token needs permission to publish Workers and manage the custom domain's route/zone. Do not copy the personal site's unrelated Stripe secrets.

The **Deploy marketing site** GitHub Actions workflow is manual (`workflow_dispatch`), has no environment selector, and deploys production only from `main`. Configure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in the GitHub Environment named exactly `production`. The deployment job declares `environment: production` to access those environment-scoped secrets. Optional production environment reviewers can protect manual releases. The separate **Verify marketing deployment** workflow checks type safety, layout invariants and a build/dry run on relevant pull requests and main pushes, without Cloudflare credentials or deployment.

No deployment, secret installation or DNS mutation was performed as part of this setup. Running the production deployment later creates/updates the custom-domain DNS binding; resolve any existing conflicting record before that first release. Production disables workers.dev and preview URLs. The source repository remains private, so its GitHub Releases download link is accessible only to authorized repository users until the owner makes this repository public at release readiness. Public downloads will remain in this repository’s GitHub Releases.

References: [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/) and [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
