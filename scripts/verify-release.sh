#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
version="${GLINT_VERSION:?Set GLINT_VERSION}"
release_dir="$PWD/applications/glint-desktop/dist/releases/$version"
destination="$(mktemp -d)"
trap 'rm -rf "$destination"' EXIT
(cd "$release_dir" && shasum -a 256 -c SHA256SUMS)
ditto -x -k "$release_dir/Glint-$version-macos.zip" "$destination"
app="$destination/Glint.app"
codesign --verify --deep --strict "$app"
test "$(plutil -extract CFBundleShortVersionString raw "$app/Contents/Info.plist")" = "$version"
test "$(plutil -extract CFBundleVersion raw "$app/Contents/Info.plist")" = "$GLINT_BUILD_NUMBER"
test "$(plutil -extract GlintUpdateFeedURL raw "$app/Contents/Info.plist")" = "$GLINT_UPDATE_FEED_URL"
actual_archs="$(lipo -archs "$app/Contents/MacOS/Glint" | xargs -n1 | sort | xargs)"
expected_archs="$(echo "${GLINT_ARCHS:-arm64}" | xargs -n1 | sort | xargs)"
test "$actual_archs" = "$expected_archs"
# Reject non-system dynamic libraries that would require the build machine.
if otool -L "$app/Contents/MacOS/Glint" | tail -n +2 | awk '{print $1}' | grep -Ev '^(/System/Library/|/usr/lib/|@rpath/libswift)' ; then
  echo 'Unexpected non-system runtime dependency' >&2; exit 1
fi
(cd "$destination" && "$app/Contents/MacOS/Glint" --verify-package)
ruby -c "$release_dir/glint.rb"
node --input-type=module - "$release_dir" "$version" <<'JS'
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [dir, version] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(`${dir}/latest.json`));
assert.equal(manifest.version, version);
assert.equal(manifest.url, `${process.env.GLINT_DOWNLOAD_BASE_URL}/Glint-${version}-macos.zip`);
assert.equal(manifest.sha256, crypto.createHash('sha256').update(fs.readFileSync(`${dir}/Glint-${version}-macos.zip`)).digest('hex'));
JS
