#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="applications/glint-desktop"
swift build --package-path "$project" -c release
bin_path="$(swift build --package-path "$project" -c release --show-bin-path)"
app="$project/dist/Glint.app"
# This path is generated output owned by this script.
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$bin_path/Glint" "$app/Contents/MacOS/Glint"
cp "$project/Resources/Info.plist" "$app/Contents/Info.plist"
for resource in "$bin_path"/*.bundle; do
  [ -d "$resource" ] || continue
  cp -R "$resource" "$app/Contents/Resources/"
done
# Free ad-hoc signature: integrity for Apple silicon, no Developer ID or notarization.
codesign --force --sign - "$app"
printf 'Built %s (host architecture; development only)\n' "$app"
