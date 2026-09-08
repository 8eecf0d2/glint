# Glint

A native macOS window manager with Spectacle's movement behavior and familiar keyboard shortcuts.

**Status:** implementation-complete development build. The native app includes Spectacle-compatible geometry, all 18 global shortcuts, Accessibility window control, display traversal, application-scoped undo/redo, editable persistent shortcuts, login controls and manual update discovery. The static site and release/tap tooling are implemented. Live application compatibility, clean-machine installation, public hosting and Broderick's acceptance remain external release gates.

## Workspace

- `applications/glint-desktop` — SwiftUI/AppKit app, SwiftPM, macOS 14+ proposed minimum.
- `applications/glint-site` — React/TypeScript/Vite/Tailwind static marketing and installation site.
- `libraries/glint-core` — pure Swift geometry, display, history, quantization and shortcut defaults.
- `scripts` — development and versioned release bundling with free ad-hoc signatures.
- [Glint Tesse documents](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents) — product, behavior, operations and reference knowledge.

## Development

Use Node 24 (see .nvmrc), npm and Xcode or the macOS Command Line Tools with Swift 6+. No Apple Developer Program membership is required.

```sh
npm ci
npm run build
npm run typecheck
npm run package:desktop
npm run dev:desktop
```

`package:desktop` produces `applications/glint-desktop/dist/Glint.app` for the host architecture. `dev:desktop` opens it. Grant Accessibility access before moving external windows and quit Spectacle while testing overlapping shortcuts. Swift native builds are not cached by Nx.

[Architecture and scope](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a08348-026a-7343-9dee-eb12d16b49b9) · [Spectacle parity](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a083e0-94db-7db3-a04d-8185b307cb30) · [Shortcut defaults](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a083e0-95e7-7e66-a9a4-519f18d0cb96) · [Delivery map](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a083e1-3b53-7af7-9b33-ce0dfc80c67d) · [Verification](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a083e0-e544-724d-ad61-a356e6e37b34)

Work is managed in the personal [Glint Tesse workspace](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d), task prefix GLNT. The repository is public and uses GitHub Releases for downloads. Work and commit directly on main, with task identifiers in commits. Do not create pull requests, task branches or worktrees.

## Distribution intent

Direct downloads first; a self-maintained Homebrew tap after installation validation. “Unsigned” means a free ad-hoc signature without Developer ID or notarization. It still requires the macOS user approval path and Accessibility permission. Official homebrew/cask requires Gatekeeper compliance. No public release is available until the external gates in [the release process](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a083e0-e43f-7752-8049-3aa43c6a5a6f) are complete.

Spectacle 1.2 is the MIT behavior reference; see [third-party notices](THIRD_PARTY_NOTICES.md). Glint is Copyright 2026 Broderick Wilkinson, licensed under [Apache 2.0](LICENSE). Third-party components retain their own licenses.

Single Nx affected pipeline and publication gates: [release operations](docs/release.md). Installation and recovery: [install guide](docs/install.md).
