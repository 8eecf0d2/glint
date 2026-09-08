#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="applications/glint-desktop"
version="${GLINT_VERSION:-0.0.0}"
build_number="${GLINT_BUILD_NUMBER:-1}"
architectures="${GLINT_ARCHS:-$(uname -m)}"
app="$project/dist/Glint.app"
# This path is generated output owned by this script.
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"

binaries=()
for architecture in $architectures; do
  scratch_path="$project/.build/release-$architecture"
  swift build --package-path "$project" --scratch-path "$scratch_path" -c release --arch "$architecture"
  bin_path="$(swift build --package-path "$project" --scratch-path "$scratch_path" -c release --arch "$architecture" --show-bin-path)"
  binaries+=("$bin_path/Glint")
done
if [ "${#binaries[@]}" -eq 1 ]; then
  cp "${binaries[0]}" "$app/Contents/MacOS/Glint"
else
  lipo -create "${binaries[@]}" -output "$app/Contents/MacOS/Glint"
fi

cp "$project/Resources/Info.plist" "$app/Contents/Info.plist"
plutil -replace CFBundleShortVersionString -string "$version" "$app/Contents/Info.plist"
plutil -replace CFBundleVersion -string "$build_number" "$app/Contents/Info.plist"
plutil -replace GlintUpdateFeedURL -string "${GLINT_UPDATE_FEED_URL:-}" "$app/Contents/Info.plist"
icon_output="$project/Resources/IconComposer"
expected_icon_hash="$(cat "$icon_output/source.sha256")"
actual_icon_hash="$(scripts/icon-source-hash.sh)"
if [ "$expected_icon_hash" != "$actual_icon_hash" ]; then
  echo "Icon Composer resources are stale; run npm run icon:desktop" >&2
  exit 1
fi
cp "$icon_output/Assets.car" "$app/Contents/Resources/Assets.car"
cp "$icon_output/AppIcon.icns" "$app/Contents/Resources/AppIcon.icns"
for resource in "$bin_path"/*.bundle; do
  [ -d "$resource" ] || continue
  cp -R "$resource" "$app/Contents/Resources/"
done
cp THIRD_PARTY_NOTICES.md "$app/Contents/Resources/THIRD_PARTY_NOTICES.md"
cp THIRD_PARTY_NOTICES.md "$app/Contents/Resources/SPECTACLE-LICENSE.md"
if [ -f LICENSE ]; then cp LICENSE "$app/Contents/Resources/LICENSE"; fi
if [ -n "${GLINT_PROVENANCE_FILE:-}" ]; then
  cp "$GLINT_PROVENANCE_FILE" "$app/Contents/Resources/BUILD-PROVENANCE.txt"
fi
# Free ad-hoc signature: integrity for Apple silicon, no Developer ID or notarization.
codesign --force --sign - "$app"
printf 'Built %s (%s; ad-hoc signed)\n' "$app" "$architectures"
