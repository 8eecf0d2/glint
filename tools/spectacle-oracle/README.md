# Spectacle 1.2 offline oracle

This development-only runner executes the original Spectacle 1.2 JavaScript calculators from the pinned local checkout at commit `eacf5bb6499257c83e03f51660f38106af8ee914`. It supplies CoreGraphics-compatible rectangle helpers and writes deterministic JSON fixtures. No reference code is linked into or shipped with Glint.

```sh
SPECTACLE_REFERENCE=/tmp/glint-spectacle-reference npm run fixtures:spectacle
```

The committed corpus lives at `libraries/glint-core/Tests/GlintCoreTests/Fixtures/spectacle-1.2.json`. Spectacle is MIT licensed; the retained notice is in `THIRD_PARTY_NOTICES.md` and release artifacts include it.
