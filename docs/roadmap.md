# Delivery map

Managed in [Glint](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d). No invented due dates; work is ordered by acceptance gates and real dependencies. Broderick is the default assignee. Bootstrap is tracked as GLNT-1; all product implementation remains planned.

## [01 · Prove the foundations](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/milestones/01a08345-48ef-751f-abdc-9caddfbd835a)

| Task | Deliverable | Prerequisites |
| --- | --- | --- |
| [GLNT-1](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-5dc2-727d-a049-ae21e0474540) | Bootstrap the Nx repository and capture the investigation | — |
| [GLNT-2](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-5f62-7a3b-9c58-4a1093eae1df) | Build a Spectacle 1.2 behavioral oracle and fixture corpus | GLNT-1 |
| [GLNT-3](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-6123-7adc-aa4a-a0c4512737b3) | Prove native Accessibility, focus and global shortcut feasibility | GLNT-1 |
| [GLNT-4](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-62f7-72af-aa4d-1f6ed88f7b86) | Validate downloaded ad-hoc app installation and upgrade permissions | GLNT-1 |

## [02 · Match Spectacle movement](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/milestones/01a08345-49f3-70ad-a349-4261fb4bb599)

| Task | Deliverable | Prerequisites |
| --- | --- | --- |
| [GLNT-5](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-64bb-702b-8172-f51969073b48) | Implement pure Swift geometry with differential parity | GLNT-2 |
| [GLNT-6](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-6668-726e-9f93-448d774aeafd) | Implement display selection, traversal and coordinate conversion | GLNT-2, GLNT-3 |
| [GLNT-7](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-681b-7324-8163-7894e3c0009f) | Implement bounded Accessibility window frame application | GLNT-3 |
| [GLNT-8](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-69d3-74c5-beac-72b6582068c6) | Implement application-scoped undo and redo | GLNT-2, GLNT-7 |
| [GLNT-9](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-6b8f-7201-a7a9-033652e38dd6) | Register all 18 default global shortcuts | GLNT-3 |
| [GLNT-10](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-6d5f-7c25-8b47-e441833ec765) | Connect shortcut actions to movement, displays and history | GLNT-5, GLNT-6, GLNT-7, GLNT-8, GLNT-9 |

## [03 · Make Glint a daily driver](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/milestones/01a08345-4afb-7960-acad-fbf39e10ab51)

| Task | Deliverable | Prerequisites |
| --- | --- | --- |
| [GLNT-11](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-6f29-703c-ba60-0461e97e21c0) | Finish the native menu and single Settings window | GLNT-10 |
| [GLNT-12](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-7100-717c-8def-0e734c0d9acb) | Add shortcut recording, conflict handling and persistent preferences | GLNT-9 |
| [GLNT-13](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-72e2-72dd-b78d-b5b6d60d88cb) | Add Accessibility onboarding, login and permission recovery | GLNT-4, GLNT-7, GLNT-11 |
| [GLNT-14](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-74c2-7e82-abb1-ca55191c7be0) | Run the macOS and application compatibility matrix | GLNT-10, GLNT-11, GLNT-12, GLNT-13 |
| [GLNT-15](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-7694-7b46-80ba-5d7386a7c308) | Complete Broderick's Spectacle replacement acceptance | GLNT-14 |

## [04 · Ship a downloadable release](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/milestones/01a08345-4c10-7280-ab01-43a6f378bdfb)

| Task | Deliverable | Prerequisites |
| --- | --- | --- |
| [GLNT-16](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-7851-70e3-94d8-ee1018e8eb65) | Build reproducible versioned release artifacts and checksums | GLNT-4 |
| [GLNT-17](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-79f7-7f80-b9c1-af6673eb91fd) | Add manual update discovery and recovery instructions | GLNT-11, GLNT-16 |
| [GLNT-18](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-ee67-7d15-815a-dedd36fceaf5) | Prepare a self-maintained Homebrew tap and cask | GLNT-4, GLNT-16, GLNT-21 |
| [GLNT-19](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-f00f-7fce-ba8a-0971da157f8b) | Build the static marketing and installation website | GLNT-21 |
| [GLNT-20](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-f1cd-74f7-b045-8c52ff8a483d) | Verify fresh-machine release install, upgrade and uninstall | GLNT-15, GLNT-16, GLNT-17, GLNT-18, GLNT-19 |
| [GLNT-21](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-f36e-7cdd-a66e-7912aecb2a5e) | Decide public release identity, licensing and hosting | — |
| [GLNT-22](https://app.tesse.dev/workspaces/01a08336-b2cd-7025-af18-2926300ef38d/tasks/01a08349-f527-7915-aad5-0d2575772112) | Publish the first accepted Glint release | GLNT-20, GLNT-21 |

The critical path starts with reference behavior and the native platform spike, converges at all-action integration, then proceeds through compatibility and daily-use acceptance. Unsigned installation is investigated early; release packaging and the website can progress independently once their prerequisites are settled.

Repository mapping is configured in Tesse. GitHub App event ingestion requires its separate Settings connection; setting a repository URL alone does not install the GitHub App.
