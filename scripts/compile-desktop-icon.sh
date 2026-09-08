#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 OUTPUT_DIRECTORY" >&2
  exit 64
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
source_icon="$root/brand/Glint.icon"
output="$1"
temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT

mkdir -p "$output"
xcrun actool "$source_icon" \
  --compile "$temporary" \
  --platform macosx \
  --minimum-deployment-target 26.0 \
  --app-icon Glint \
  --output-partial-info-plist "$temporary/partial.plist" \
  --errors \
  --warnings >/dev/null

cp "$temporary/Assets.car" "$output/Assets.car"
cp "$temporary/Glint.icns" "$output/AppIcon.icns"
"$root/scripts/icon-source-hash.sh" > "$output/source.sha256"
