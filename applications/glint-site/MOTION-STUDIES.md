# Glint motion studies — September 2026

Ten local experiments, accessed with `?motion=1` through `?motion=10`. Production ignores the query; `/` keeps the original animation. Each study has a named tab, a short gesture hint and replay/previous/next controls. A fixed random seed makes replay comparisons useful. These are alternatives to evaluate individually, not effects intended to be stacked together.

## Research and choices

Current creative-web showcases prominently feature physics, trails, drawing, hover responses and interactive grids. Those showcase categories are evidence of active exploration, not a measurement of universal popularity. [Codrops' current original demos](https://tympanus.net/codrops/hub/all/codrops/) informed the range. The [March 2026 structured-grid tutorial](https://tympanus.net/codrops/2026/03/02/sticky-grid-scroll-building-a-scroll-driven-animated-grid/) is a useful example of motion organized around rhythm and layout phases.

For Glint, the strongest constraint is the subject: moving and resizing windows. Interaction should make that behavior more tangible or understandable. Color changes and camera parallax were explicitly rejected. Avoid scroll hijacking, custom cursor replacements, glitter, text movement and unrelated 3D decoration. Keep the hero immediately available. Some studies intentionally reach further into playfulness to establish the user's preference boundary.

| # | Study | What it explores | Main evaluation question |
|---|---|---|---|
| 01 | Soft springs | Slower damped arrival with a restrained compression/rebound | Does it feel tactile or rubbery? |
| 02 | Snap foresight | Dashed destinations appear before window transitions | Does anticipation add polish or visual clutter? |
| 03 | Motion echoes | Two fading monochrome silhouettes preserve recent movement | Does continuity feel elegant or smeared? |
| 04 | Cursor wake | Passing over a window briefly compresses it | Is the response discoverable and satisfying? |
| 05 | Hold that thought | Hovering a window pauses the scene; leaving resumes it | Does giving control feel helpful or interruptive? |
| 06 | Tap wave | A click sends an expanding ring and delayed compression through windows | Is this a delightful extra or a distraction? |
| 07 | Live dividers | Pointer position selects real quarter-screen proportions | Does direct manipulation communicate the product? |
| 08 | Edge tracing | Nearby outlines progressively draw and recede | Is precision enough, without additional movement? |
| 09 | Quiet choreography | A composed sequence of expansions and longer rests | Is pacing alone the missing polish? |
| 10 | Reveal lens | Pointer clears a small area of the existing blur | Does revealing detail reward exploration? |

Start feedback with 02, 08 and 09: they fit the product's emphasis on spatial clarity. 04 and 06 deliberately test a more playful direction. 05 and 07 give the visitor control. 01 and 03 isolate motion character; 10 isolates the existing blur treatment. This recommendation is design judgment, not a finding that one effect is statistically more popular.

## Constraints

All fills retain the original neutral palette. Echoes, guides and rings use neutral gray only. No camera transforms. Hero, download action, footer and controls do not capture background gestures. Mouse-only studies require a fine hovering pointer; the tap wave also supports touch. Reduced motion uses a static composition. Hidden tabs cancel animation frames and resume without a catch-up burst. Shared partitions retain their existing minimum sizes, and compression never enlarges a window beyond its allocated rectangle. The renderer is isolated in `StudyWindows.tsx` so prototype behavior cannot change the baseline.

Tests cover the production layout invariants. Typecheck/build verify both renderers. Browser review is still necessary for subjective timing, Safari masking and visual preference. These studies add no dependencies and are not deployed.

## Round two: studies 11–13

Feedback: 7 was the strongest interaction but its snapping and delayed response broke cursor connection. 8 had potential but a plain border was insufficient. 2 and 3 were interesting but poorly executed; the other directions were rejected or unclear.

- **11 — Cursor-connected:** the shared vertical divider follows the actual cursor x-coordinate with a roughly 31 ms response, clamped by the minimum width of each side. No quantization, beat delay, lifecycle interruption or autonomous movement. Compact layouts use cursor y instead.
- **12 — Traveling sheen:** existing choreography with a short silver highlight traveling around nearby rounded window edges. A bright head, tapered tail and soft feather replace the full outline. Proximity fades it in/out; the fill stays unchanged.
- **13 — Living seams:** continuous x/y control over shared widths and row heights, paired with the moving sheen. Nested rows preserve minimum heights. Cursor movement across the hero remains connected while all text and links retain their normal behavior.

The original ten remain available. Study navigation now includes all thirteen. Continuous partitioning is an opt-in argument used by 11/13; baseline snapping remains the default. Layout tests verify arbitrary cursor positions, clamping and non-overlap. No new dependencies or deployment.
