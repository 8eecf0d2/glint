# Glint desktop

Native SwiftUI/AppKit menu bar app, macOS 14+, built with SwiftPM. Open Package.swift in Xcode or run `npm run dev:desktop` from the root. It implements the 18 captured global shortcuts, Accessibility-based frame movement, display traversal, application-scoped undo/redo, persistent shortcut recording, pause and login controls.

The development packaging script defaults to the host architecture and applies a free ad-hoc signature. The release script can build arm64 or a requested universal artifact, injects a manual update feed, writes checksums and includes notices. Clean-machine installation remains external validation. The app is not sandboxed. The provisional stable bundle ID is `dev.8eecf0d2.glint`.

The single CI workflow uses Nx affected to test, build/package and publish native changes on authorized main runs. Release version and bundle build number are explicitly maintained in `release.json`; no automatic bumps or tag-triggered workflow. See `docs/release.md` at the repository root.
