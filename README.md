# Glint

A native macOS window manager with Spectacle's movement behavior and familiar keyboard shortcuts.

**Status:** repository and planning scaffold. The Mac app currently opens a native menu and a read-only Settings list of the 18 captured defaults. Window movement and global hotkeys are planned work. The marketing package is reserved and configured; there is no published site or release.

## Workspace

- `applications/glint-desktop` — SwiftUI/AppKit app, SwiftPM, macOS 14+ proposed minimum.
- `applications/glint-site` — React/TypeScript/Vite/Tailwind marketing package, following Tesse's libraries.
- `libraries/glint-core` — Swift shared defaults; future pure geometry and history engine.
- `scripts` — local native app bundling; free ad-hoc signature, no Developer ID.
- `docs` — investigation, behavior contract, exact shortcuts and delivery map.

## Development

Use Node 24 (see .nvmrc), npm and Xcode or the macOS Command Line Tools with Swift 6+. No Apple Developer Program membership is required.

```sh
npm ci
npm run build
npm run typecheck
npm run package:desktop
npm run dev:desktop
```

`package:desktop` produces `applications/glint-desktop/dist/Glint.app` for the host architecture. `dev:desktop` opens it; it does not move other windows. Swift native builds are not cached by Nx yet. The site has typecheck but intentionally no page/build/dev target until the marketing task is implemented.

[Implementation plan](docs/plan.md) · [Spectacle parity](docs/spectacle-parity.md) · [Shortcut defaults](docs/shortcuts.md) · [Delivery map](docs/roadmap.md)

Work is managed in the personal [Glint Tesse workspace](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d), task prefix GLNT. The GitHub repository stays private. Default branch: main. Use task branches such as `codex/GLNT-2-behavior-fixtures` and name task identifiers in commits/PRs.

## Distribution intent

Direct downloads first; a self-maintained Homebrew tap after installation validation. “Unsigned” means a free ad-hoc signature without Developer ID or notarization. It still requires the macOS user approval path and Accessibility permission. Official homebrew/cask requires Gatekeeper compliance. No release is available yet; see the [distribution research](docs/plan.md#distribution-without-a-paid-account).

Spectacle 1.2 is the MIT behavior reference; see [third-party notices](THIRD_PARTY_NOTICES.md). Glint's own publication license is a release decision.
