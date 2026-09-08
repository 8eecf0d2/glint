# Install, update and recover

Release preparation: no accepted public release or clean-machine install is claimed yet. The release pipeline builds for Apple silicon with a macOS 14 compilation floor. Intel support and OS acceptance require separate evidence.

Download the versioned ZIP and SHA256SUMS from the same GitHub Release. Verify the ZIP with `shasum -a 256 Glint-X.Y.Z-macos.zip` and compare the full digest with its SHA256SUMS entry. Extract Glint.app and move it to Applications. Open it there.

Glint is ad-hoc signed, without Developer ID or notarization. If macOS blocks it, use System Settings → Privacy & Security → Open Anyway when offered, then confirm opening. Managed Macs may prohibit this. Do not disable Gatekeeper or remove quarantine. Grant Accessibility to the installed copy to enable window movement. Quit Spectacle or other conflicting shortcut managers.

## Manual updates and rollback

Check for Updates in Glint compares the stable GitHub Release manifest only when requested, and offers a download. It never installs updates. Until the repository is public and the first release exists, checks may fail.

Retain the old ZIP and checksum. Download and verify the new ZIP, quit Glint, replace the Applications copy, then reopen. An ad-hoc signature changes with the binary: existing Accessibility approval may no longer match. If movement stops, remove the stale Glint row in System Settings → Privacy & Security → Accessibility, add the current Applications copy and relaunch. Recheck launch-at-login in Glint and System Settings → General → Login Items; persistence across replacement still needs acceptance testing.

For rollback, quit Glint and replace it with the retained, checksum-verified old copy. Repeat Accessibility and login recovery as needed. Preferences are retained; compatibility with older versions must be checked before rollback. Homebrew installations should use their tap's documented upgrade flow (`brew upgrade --cask <tap>/glint` once published), with Homebrew owning replacement rather than a parallel manual install.

## Uninstall

Turn off launch at login in Glint, quit it, remove Glint.app, and remove its Accessibility entry if desired. Preferences remain unless explicitly removed (`~/Library/Preferences/dev.8eecf0d2.glint.plist`). For a future tap installation use `brew uninstall --cask <tap>/glint`; `--zap` also removes preferences. The cask requests app termination but does not guarantee login deregistration; disable login first.

## Fresh-machine acceptance record

For each supported macOS and architecture, record version/build, browser, ZIP digest, quarantine present, Open Anyway availability, initial launch/resources, Accessibility grant, actual window movement, login after reboot, prior-version update discovery, replacement, permission recovery, rollback and uninstall. Include Homebrew version, tap trust prompt and install/upgrade/uninstall when the tap exists. These checks remain pending; local extraction and smoke checks do not satisfy them.
