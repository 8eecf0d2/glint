# Spectacle 1.2 behavior reference

Pinned release: `eacf5bb6499257c83e03f51660f38106af8ee914`, matching the installed app's 1.2 version. Findings below come from source inspection, not a completed live comparison. The reference tests and macOS observations remain the first implementation task. The source is MIT; retain [its notice](reference/SPECTACLE-LICENSE.md) with derived code and fixtures.

## Geometry

Use usable display bounds, excluding Dock/menu bar. Fullscreen is maximize within those bounds, not the native full-screen Space API. Center keeps size and uses separate floor(screen/2) − floor(window/2) terms in 1.2. Master later changes rounding, which can differ by one point. [Center source](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleCenterWindowCalculation.js).

Left/right and top/bottom repeatedly cycle half → two thirds → one third → half. Corners keep half-height and cycle their width in that order. Detection is based on the current rectangle fitting inside and being centered within a candidate, using a one-point midpoint tolerance; it is not a counter of key presses. This matters for quantized terminal frames and manual window moves. Odd dimensions are floored with edge remainders accounted for. [Left half](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleLeftHalfWindowCalculation.js), [top half](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleTopHalfWindowCalculation.js), [upper left](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleUpperLeftWindowCalculation.js), [helpers](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleWindowCalculationHelpers.js).

Thirds cycle left column → middle column → right column → top row → middle row → bottom row → left column. Previous reverses this order; either action starts at the left column when the current frame matches none. [Thirds source](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleNextOrPreviousThirds.js).

Larger/smaller changes width and height by ±30 points, centered unless contact with screen edges anchors them. Edge proximity uses five points. Opposite-edge contact preserves that dimension; shrinking a maximized window has an explicit centered exception. Shrinking is rejected when either resulting dimension is at or below one quarter of its display dimension. [Larger](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleLargerWindowCalculation.js), [size adjuster](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleWindowSizeAdjuster.js).

## Displays

The source display is chosen from containment/largest intersection. Spectacle orders the origin display first, then stable descending coordinate comparisons (x as the final sort, y as its prior stable sort). Next/previous wraps; only one display yields no destination. Capture fixtures for staggered layouts before simplifying this order. [Screen detector](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Sources/SpectacleScreenDetector.m).

Moving to another display centers the window at its current size if it fits; otherwise it fills the destination's usable frame. It does not preserve proportional position. [Display calculation](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Resources/Window%20Position%20Calculations/SpectacleNextOrPreviousDisplay.js).

## Applying frames and history

The mover first applies a frame, then compensates for cell-quantized sizes by reducing dimensions in two-point steps, stopping before shrinking below 85% of the requested dimensions, and centering the actual result in the target. A final best-effort correction keeps edges within the usable frame. Glint should bound attempts/time and retain real application constraints. [Quantized mover](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Sources/SpectacleQuantizedWindowMover.m), [best-effort mover](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Sources/SpectacleBestEffortWindowMover.m).

History belongs to the frontmost application bundle identifier, not a separate stack for each window. Entries include window references and rectangles. The source caps at 50 records and retains an initial frame. Multi-window interleaving, manual edits, dead windows and move-after-undo need explicit reference cases: do not presume conventional redo invalidation. Proposed Glint safeguards include dropping stale references and recording successful outcomes; document any difference from the reference. [Position manager](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Sources/SpectacleWindowPositionManager.m), [history](https://github.com/eczarny/spectacle/blob/eacf5bb6499257c83e03f51660f38106af8ee914/Spectacle/Sources/SpectacleHistory.m).

## Critical fixture and manual matrix

- All 18 captured bindings, uniqueness, clear/restore and persistence.
- Each half/corner repeated four times; mixed command sequences and manual intermediate moves.
- Forward/backward thirds across wrap boundaries and unmatched initial frames.
- ±30 resize at each edge, all edges, size threshold and odd display dimensions.
- Displays left/right/above/below, mixed scaling, negative origins, disconnection and one display.
- Undo/redo across multiple windows of the same app, separate apps, closed windows and post-undo moves.
- Finder, Safari, a Chromium browser, Terminal/iTerm and an Electron application, including constrained windows and sheets.
- Accessibility denied/revoked/regranted; menu focus changes, Settings open, sleep/wake, restart and upgrade.

Record target rectangles separately from actual AX readback. Generate the reference corpus from the pinned calculations and specs, then use it as the Swift port's differential oracle. Keep the legacy source/reference runner outside the shipped app. Product parity acceptance requires Broderick's daily-use review; passing arithmetic alone is insufficient.
