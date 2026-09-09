#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
identity_file="$HOME/Library/Application Support/Glint/Signing/identity.sha1"
if [ ! -f "$identity_file" ]; then
  echo "Set up a persistent local signing identity; see applications/glint-desktop/README.md." >&2
  exit 1
fi
export GLINT_SIGNING_IDENTITY="$(cat "$identity_file")"
if ! security find-identity -v -p codesigning | grep -Fq "$GLINT_SIGNING_IDENTITY"; then
  echo "The configured Glint development identity is unavailable in Keychain." >&2
  exit 1
fi
mkdir -p applications/glint-desktop/dist
staging="$(mktemp -d "$PWD/applications/glint-desktop/dist/dev.XXXXXX")"
trap 'rm -rf "$staging"' EXIT
export GLINT_APP_OUTPUT="$staging/Glint.app"
export GLINT_VERSION="$(node -p "require('./applications/glint-desktop/release.json').version")"
export GLINT_BUILD_NUMBER="$(node -p "require('./applications/glint-desktop/release.json').buildNumber")"
export GLINT_UPDATE_FEED_URL="https://github.com/8eecf0d2/glint/releases/latest/download/latest.json"
bash scripts/package-desktop.sh
swift scripts/install-development.swift "$GLINT_APP_OUTPUT" "$HOME/Applications/Glint.app"
