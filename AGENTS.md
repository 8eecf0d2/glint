Keep responses and tool use concise and direct.
Only write and run tests for critical code paths. Run tests at the end of completing work, before responding.
Track planned work in the personal Glint Tesse workspace (GLNT): https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d
Work and commit directly on main in the existing root checkout. Do not create pull requests, task branches or worktrees; Broderick explicitly chose direct-main development.
Read the Tesse [architecture and scope](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a08348-026a-7343-9dee-eb12d16b49b9) and [Spectacle behavior reference](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/documents/01a083e0-94db-7db3-a04d-8185b307cb30) before implementing desktop behavior.
Keep the macOS app native Swift/SwiftUI/AppKit; Nx coordinates builds, not the runtime.
Preserve the captured shortcut defaults. Distinguish verified Spectacle behavior, proposed Glint behavior, and implemented behavior.
The repository is public and Glint is Apache-2.0 licensed. The authorized main pipeline deploys affected production outputs and publishes explicitly versioned GitHub Releases. Never overwrite published versions. No Developer ID signing or notarization.
