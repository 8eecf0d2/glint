# Glint implementation plan

Investigated 2026-09-09. This is the proposed implementation, not a claim that window management is complete. Track delivery in [Glint on Tesse](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d).

## Direction

Build a native macOS menu bar utility that reproduces Spectacle 1.2 movement behavior and Broderick's 18 custom shortcuts. Keep one native Settings window and no regular Dock presence. Treat repeated commands and constrained-window behavior as first-class product requirements. No accounts, cloud backend, window-content collection, Electron, webview desktop UI, or private window-management APIs are needed for this scope.

The installed Spectacle is version 1.2 and its executable is x86_64 only. Apple documents general Rosetta availability through macOS 27 and a restricted subset thereafter; that is a concrete longevity concern on Apple silicon, not proof of an exact Spectacle failure date. [Apple Rosetta documentation](https://developer.apple.com/documentation/apple-silicon/about-the-rosetta-translation-environment).

## Stack and boundaries

| Surface | Choice | Reason |
| --- | --- | --- |
| Repository | Nx 22 + npm workspaces; main branch | Matches Tesse's applications/libraries convention and package manager |
| Desktop | Swift 6, SwiftPM, SwiftUI + AppKit, provisional macOS 14 minimum | Native controls, small runtime, no paid account needed to build |
| Menu and settings | MenuBarExtra, Settings scene, LSUIElement; NSStatusItem if focus/menu behavior requires it | Standard system menu, keyboard access and Settings conventions |
| Window operations | ApplicationServices AXUIElement; NSScreen visibleFrame; NSWorkspace | Read the focused external window and set its frame with Accessibility permission |
| Pure behavior | libraries/glint-core | Geometry, defaults and history isolated from UI and AX for deterministic checks |
| Shortcuts | Evaluate and pin KeyboardShortcuts through SwiftPM | Native recorder and global hotkeys; isolate its API so it can be replaced |
| Login | SMAppService.mainApp | System-managed login preference and permission state |
| Marketing | React 19 + TypeScript + Vite 7 + Tailwind 4 + Lucide | Matches Tesse site preferences; static output; TanStack Router only if needed |
| Releases | GitHub Releases + direct website links; own Homebrew tap | Ad-hoc signatures initially; no Developer ID or notarization assumed |

Nx runs Swift commands through nx:run-commands and models desktop → core explicitly. SwiftPM handles Swift dependencies and compilation. Native task caching is initially disabled to avoid restoring incompatible .build artifacts; introduce toolchain/SDK/architecture inputs and controlled outputs before enabling it. [Nx task configuration](https://nx.dev/docs/reference/project-configuration), [Nx executors](https://nx.dev/docs/reference/nx/executors).

The scaffold uses macOS 14 for the native SettingsLink. Compatibility claims must be validated before release. SwiftPM can produce a native app using a small bundle script; an Xcode project generator is unnecessary at this stage. Add one only if resources, signing or debugging require it.

## Implementation sequence

1. **Prove the foundations.** Create the monorepo, preserve defaults, pin Spectacle 1.2, generate a differential geometry fixture set, spike AX/global shortcuts, and test downloaded ad-hoc app install/update behavior before committing to release ergonomics.
2. **Match movement.** Port pure geometry to Swift; implement AX frame application, multi-display selection, application-scoped undo/redo and all 18 shortcuts. Compare outputs to reference fixtures. Keep bug fixes and behavior changes explicit.
3. **Daily driver.** Finish the standard menu and single Settings page, shortcut recording/conflicts, onboarding, launch at login, pause controls, permission recovery and real-window compatibility. Use Glint in place of Spectacle for acceptance.
4. **Release.** Build native arm64 and, if supported/tested, x86_64 artifacts. Add versioning, checksums, third-party notices, manual update discovery, direct downloads, a self-maintained cask and a static website. Validate the downloaded artifact on clean machines, not only local builds.

## Desktop design

The menu shows grouped actions with their shortcuts, pause/resume, Settings, About, update discovery and Quit. It must retain the intended external window when the menu or Settings gains focus. Use native sizing, semantic colors, accessibility labels, system typography and standard keyboard conventions.

One Settings window contains General (login, pause, permission state) and a grouped shortcut list with record, clear and restore controls. Prefer a simple native form; avoid recreating Spectacle's old preferences grid. Accessibility access is requested only when needed, with clear status and a link to the system pane. Login is intended enabled based on the screenshot, but must remain user-controlled and reflect SMAppService status.

The app runs outside App Sandbox for cross-application AX control. No Screen Recording or Input Monitoring request is planned; the platform spike must confirm hotkeys work through the selected API with Accessibility alone. Scope v1 to windows exposed through Accessibility in the active Space. Moving windows between Spaces or controlling native full-screen Spaces is out of scope.

## Key technical risks and acceptance

- **Behavior fidelity:** compare sequences and final AX readbacks, not just target rectangles. Use the installed 1.2 release rather than master (master changes centering rounding).
- **Coordinate systems:** explicitly convert between AppKit's bottom-left screen coordinates and AX's top-left coordinates. Check negative origins, vertically arranged displays, odd dimensions, mixed scaling, Dock/menu bar insets and display removal.
- **Constrained windows:** minimum/maximum sizes and Terminal cell quantization require bounded retries and final frame readback. Do not loop indefinitely on an unresponsive app.
- **History:** Spectacle history is application-scoped, storing window references, with a cap of 50 records. Verify interleaved windows and branch-after-undo behavior rather than substituting a generic per-window stack.
- **Focus:** do not move Glint's Settings window when an external window was targeted; revalidate AX element liveness before writes.
- **Unsigned updates:** an ad-hoc signature is not a stable Developer ID identity. Accessibility grants and login behavior may need recovery after replacement; test this early and document the observed outcome rather than promise persistence.
- **Conflicts:** quit/disable Spectacle when registering identical hotkeys. Preserve clear/restore semantics and handle other app/system shortcut conflicts.

Only critical paths need automated tests: geometry sequences, coordinate conversion, history and bounded AX error handling. Run them once implementation is complete. Use a manual matrix for menu/Settings polish and live application compatibility.

## Distribution without a paid account

Use a valid **ad-hoc signature** (free, no identity) for Apple silicon. This is what “unsigned” means here: no Apple Developer ID and no notarization. It does not provide Gatekeeper approval. [Apple on arm64 signature requirements](https://support.apple.com/en-ie/guide/security/secebb113be1/web), [Apple notarization requirements](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).

Direct downloads should contain Glint.app in a ZIP initially; consider DMG after the pipeline is stable. Users install in Applications, attempt to open, then use System Settings → Privacy & Security → Open Anyway when macOS offers it, and grant Accessibility separately. Do not promise the override exists on managed machines. Do not disable Gatekeeper, strip quarantine automatically, or ship a bypass installer. [Apple installation guidance](https://support.apple.com/en-gb/102445).

Official homebrew/cask requires artifacts that pass Gatekeeper. Homebrew announced disabling failures in September 2026. A self-maintained tap is the proposed channel and requires its own installation validation; it does not remove macOS checks. New Homebrew versions also require explicit trust for non-official taps. Document the supported installed Homebrew flow at release time. [Cask acceptance](https://docs.brew.sh/Acceptable-Casks), [Homebrew announcement](https://brew.sh/2025/11/12/homebrew-5.0.0/), [tap trust](https://docs.brew.sh/Tap-Trust).

Start with manual updates via Releases and brew upgrade. Evaluate Sparkle later only with a carefully verified update-signature and unsigned-app trust model. Keep an optional future Developer ID/notarization path, but it is not a dependency of the planned v1. The GitHub repository must remain private. Public downloads require separate public binary hosting; product license, download host, domain and Intel support remain release decisions, not bootstrap blockers. Do not make the source repository public to expose GitHub Release assets.

## Primary API references

- [MenuBarExtra](https://developer.apple.com/documentation/swiftui/menubarextra)
- [AXUIElement](https://developer.apple.com/documentation/applicationservices/axuielement)
- [SMAppService](https://developer.apple.com/documentation/servicemanagement/smappservice)
- [KeyboardShortcuts](https://github.com/sindresorhus/KeyboardShortcuts)
- [Spectacle 1.2](https://github.com/eczarny/spectacle/tree/eacf5bb6499257c83e03f51660f38106af8ee914)

## Current scaffold

Present: Nx projects, npm lockfile, site stack/configuration (no page yet), native menu/Settings shell, shared default data, host-architecture ad-hoc bundle script, CI build checks, reference notes and Tesse backlog. Absent: actual movement, global registration, permission onboarding, login registration, finished marketing page, public release and tap. No production behavior is implied by successful scaffold builds.
