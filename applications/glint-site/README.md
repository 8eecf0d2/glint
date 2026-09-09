# Glint site

Minimal single-viewport marketing site built with React 19, TypeScript, Vite 7 and Tailwind 4. It intentionally contains only the Glint identity, hero copy, download action and private repository link. Run `npm run dev:site` from the repository root. Copy `.env.example` only when preparing a real deployment. Set `VITE_GLINT_DOWNLOAD_URL` only after a public binary has passed the release validation gate; without it the page shows a disabled download button. Set `VITE_GLINT_ARCHITECTURES` to the exact validated release architectures when publishing.

The site temporarily imports `brand/drafts/glint-mark.svg` for review. Do not treat that draft as canonical or propagate it to packaged app surfaces until GLNT-23 is approved.

The background uses a repeating sequence of local window adjustments: one or two windows move at a time, with 360–440 ms transitions and longer rests between phrases. Elasticity settles with the movement. A feathered white clearing behind the hero protects copy readability. Rendering sleeps during holds, reduced motion and hidden tabs; narrow viewports show one complete window pair.
