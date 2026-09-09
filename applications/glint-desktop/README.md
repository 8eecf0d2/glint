# Glint desktop

Native SwiftUI/AppKit menu bar app, macOS 14+, built with SwiftPM. Open Package.swift in Xcode or run `npm run dev:desktop` from the root. It implements the 18 captured global shortcuts, Accessibility-based frame movement, display traversal, application-scoped undo/redo, persistent shortcut recording, login controls.

Local development uses a persistent free signing certificate. Raw release packaging defaults to ad-hoc signing. The release script can build arm64 or a requested universal artifact, injects a manual update feed, writes checksums and includes notices. Clean-machine installation remains external validation. The app is not sandboxed. The provisional stable bundle ID is `dev.8eecf0d2.glint`.

The single CI workflow uses Nx affected to test, build/package and publish native changes on authorized main runs. Release version and bundle build number are explicitly maintained in `release.json`; no automatic bumps or tag-triggered workflow. See `docs/release.md` at the repository root.

## Stable local development permissions

`npm run dev:desktop` automatically sets up or reuses a persistent local code-signing certificate, builds in a temporary directory, quits running Glint copies, then installs and opens `~/Applications/Glint.app`. It fails rather than silently falling back to ad-hoc signing. The signing certificate fingerprint is read from `~/Library/Application Support/Glint/Signing/identity.sha1`; its private key stays in the login Keychain and is never committed. A local self-signed code-signing certificate is free and requires no Apple developer membership. Keep the same certificate across rebuilds. The certificate must have the code-signing extended key usage and be trusted for code signing in the user's Keychain.

After switching from ad-hoc signing, quit Glint and reset only its old Accessibility entry with `tccutil reset Accessibility dev.8eecf0d2.glint`, then open the installed copy and grant it access in System Settings. Permission persistence must be verified across a subsequent rebuild. Do not reset all apps' permissions. The packaged public release still defaults to ad-hoc signing; local trust does not confer Developer ID or notarization.

See [Development workflow](../../docs/development.md) for the one-command flow, Keychain setup and targeted permission recovery.
