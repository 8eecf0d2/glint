# Bootstrap verification

Verified locally on 2026-09-09 using Node 24.5.0, npm 11.5.1 and Apple Swift 6.3.3 targeting arm64 macOS 26.

- npm install completed; package-lock.json records resolved versions.
- Nx project discovery found glint-core, glint-desktop and glint-site.
- Site TypeScript/Vite configuration typecheck passed.
- Both Swift package builds passed through Nx.
- Host-architecture release app bundling passed.
- codesign --verify --strict passed for the generated Glint.app; this verifies ad-hoc integrity, not Developer ID or Gatekeeper approval.
- Info.plist validation passed; executable inspection confirmed arm64.
- All 18 canonical defaults exactly match the saved Spectacle binding strings, are unique, and the JSON is present in the app resource bundle.
- Tesse resolves codex/GLNT-2-behavior-fixtures against the new GitHub remote.

No geometry or Accessibility implementation exists yet, so no movement tests were written. The app UI, installation on another machine, minimum macOS version and GitHub-hosted CI are not established by these local checks. Those validations remain tracked work. CI is configured to build/typecheck/package the scaffold on macOS.

Tesse's repository mapping and linking preference are saved. GitHub App event ingestion still requires the workspace's Settings connection to select this repository; a URL mapping is not the installation itself. Automatic PR-driven status changes are disabled so a merge cannot silently satisfy product acceptance.
