# Release operations

The owner will make `8eecf0d2/glint` public when ready. GitHub Releases in that repository host the ZIP, checksums, update feed and notices. The marketing site remains a separate production-only Cloudflare Worker at glint.broderickwilkinson.com. No Developer ID, notarization, Apple membership or Apple secrets are used. Ad-hoc signing verifies integrity; it is not Gatekeeper approval.

## Rehearse without publication

The **Build and release Glint** workflow accepts a stable `X.Y.Z` through manual dispatch and retains its verified artifacts for 14 days. Manual runs never publish, even in a public repository. Pushes to the private review branch `codex/GLNT-16-release-pipeline` also rehearse as version `0.0.0`, never publishing. Commit/review the workflow and run it on GitHub to verify the hosted runner; local checks cannot prove a hosted run. The release job uses standard `macos-15` (Apple silicon), Node from `.nvmrc`, the npm lockfile and runner-provided Swift/Xcode. Runner images change: provenance records the actual tools; byte-identical output is expected only with the same source, inputs and toolchain, not across runner image updates.

Local equivalent:

```sh
export GLINT_VERSION=0.1.0
export GLINT_BUILD_NUMBER=1
export GLINT_ARCHS=arm64
export GLINT_DOWNLOAD_BASE_URL=https://github.com/8eecf0d2/glint/releases/download/v0.1.0
export GLINT_UPDATE_FEED_URL=https://github.com/8eecf0d2/glint/releases/latest/download/latest.json
npm run release:desktop
bash scripts/verify-release.sh
```

Output: `applications/glint-desktop/dist/releases/<version>`. The ZIP contains the native app, compiled canonical icons, menu-bar resource bundle, Spectacle notices and provenance. Sidecars include a checksum list covering every payload, manifest, generated cask, install guide and release notes. If a product LICENSE exists, it is attached. Stable versions only: the existing update comparator does not implement prerelease ordering. CI uses `github.run_number` for the build number; retain this workflow's counter and increase it beyond previously shipped build numbers if migrating workflows.

`verify-release.sh` extracts to a temporary directory, verifies all checksums, signature, exact architectures, version/build/feed metadata, dynamic dependencies, cask syntax and manifest/archive agreement. The extracted executable's `--verify-package` path loads the packaged SVG with AppKit and exits before app activation. Packaged resource lookup never falls back to the checkout. This proves resource/loading behavior, not interactive window control or fresh-machine Gatekeeper acceptance.

Release tags build arm64 only. Local universal cross-compilation remains available with `GLINT_ARCHS="arm64 x86_64"`; a successful Intel build does not establish native Intel acceptance. macOS 14 is the compilation floor, still requiring the clean-machine matrix.

## Publication, only after authorization

1. Resolve GLNT-21: choose Glint's product license/distribution terms and confirm bundle identity (`dev.8eecf0d2.glint`). Review dependency license evidence. Do not infer a license from Spectacle's MIT notice.
2. Finish GLNT-4/15/20: daily-use acceptance and downloaded installation/replacement/rollback/uninstall checks on each supported macOS/architecture. Record actual browser quarantine and Accessibility/login behavior.
3. Review and commit the root-checkout changes, make them available on main, and complete a hosted manual rehearsal. Local setup does not mean the remote workflow has run.
4. After explicit publication authorization, the owner changes repository visibility and pushes an annotated stable version tag (`vX.Y.Z`) at the accepted commit. A tag builds and verifies first; publication runs only for a public repository. Private tag runs produce artifacts only. Do not reuse/move published tags.
5. The publish job uses only `GITHUB_TOKEN` with job-scoped `contents: write`. `gh release create --verify-tag` attaches verified assets and makes the release latest. Existing releases are not overwritten. If an upload fails, inspect any partial draft before retrying; do not delete or overwrite published assets. Releasing an older tag would make its feed latest: tag versions in increasing order.
6. Verify anonymous downloads, `SHA256SUMS`, and the stable `/releases/latest/download/latest.json` redirect. The versioned archive URL must stay immutable. An old installed version must discover the new version. The website links to the Releases listing already; no visual changes are needed to enable that path once public.
7. Publish the generated cask to a separately chosen self-maintained tap after the real download works. See `distribution/homebrew/README.md`. Tap repository/name and real brew acceptance remain pending.
8. Only after deployment authorization, run **Deploy marketing site** from main. It uses GitHub environment `production` and `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`. Names were confirmed previously; values and credential validity remain unverified. No staging or automatic release-to-site deploy is configured.

References: [GitHub hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create).
