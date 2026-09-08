#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

version="${GLINT_VERSION:?Set GLINT_VERSION, for example 1.0.0}"
download_base_url="${GLINT_DOWNLOAD_BASE_URL:?Set GLINT_DOWNLOAD_BASE_URL to the public binary directory}"
update_feed_url="${GLINT_UPDATE_FEED_URL:-${download_base_url%/}/latest.json}"
build_number="${GLINT_BUILD_NUMBER:-${version//./}}"
architectures="${GLINT_ARCHS:-arm64}"
release_dir="applications/glint-desktop/dist/releases/$version"
archive="Glint-$version-macos.zip"
source_epoch="${SOURCE_DATE_EPOCH:-$(git show -s --format=%ct HEAD)}"

[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]] || {
  printf 'GLINT_VERSION must be a semantic version without a leading v\n' >&2
  exit 1
}
[[ "$build_number" =~ ^[0-9]+$ ]] || {
  printf 'GLINT_BUILD_NUMBER must contain digits only\n' >&2
  exit 1
}
[[ "$source_epoch" =~ ^[0-9]+$ ]] || {
  printf 'SOURCE_DATE_EPOCH must contain digits only\n' >&2
  exit 1
}
[[ "$download_base_url" =~ ^https://[^[:space:]\"\']+$ ]] || {
  printf 'GLINT_DOWNLOAD_BASE_URL must be an HTTPS URL without whitespace or quotes\n' >&2
  exit 1
}
[[ "$update_feed_url" =~ ^https://[^[:space:]\"\']+$ ]] || {
  printf 'GLINT_UPDATE_FEED_URL must be an HTTPS URL without whitespace or quotes\n' >&2
  exit 1
}
has_arm64=false
has_x86_64=false
for architecture in $architectures; do
  case "$architecture" in
    arm64)
      $has_arm64 && { printf 'Duplicate architecture: arm64\n' >&2; exit 1; }
      has_arm64=true
      ;;
    x86_64)
      $has_x86_64 && { printf 'Duplicate architecture: x86_64\n' >&2; exit 1; }
      has_x86_64=true
      ;;
    *)
      printf 'Unsupported architecture: %s\n' "$architecture" >&2
      exit 1
      ;;
  esac
done

if $has_arm64 && $has_x86_64; then
  cask_arch_requirement=""
elif $has_arm64; then
  cask_arch_requirement="  depends_on arch: :arm64"
else
  cask_arch_requirement="  depends_on arch: :intel"
fi

rm -rf "$release_dir"
mkdir -p "$release_dir"
provenance="$release_dir/BUILD-PROVENANCE.txt"
{
  printf 'version=%s\n' "$version"
  printf 'build_number=%s\n' "$build_number"
  printf 'architectures=%s\n' "$architectures"
  printf 'source_commit=%s\n' "$(git rev-parse HEAD)"
  printf 'source_dirty=%s\n' "$(test -n "$(git status --porcelain)" && printf true || printf false)"
  printf 'source_date_epoch=%s\n' "$source_epoch"
  printf 'package_lock_sha256=%s\n' "$(shasum -a 256 package-lock.json | awk '{print $1}')"
  printf 'swift=%s\n' "$(swift --version | head -n 1)"
  printf 'node=%s\n' "$(node --version)"
  printf 'npm=%s\n' "$(npm --version)"
} > "$provenance"

GLINT_VERSION="$version" \
GLINT_BUILD_NUMBER="$build_number" \
GLINT_ARCHS="$architectures" \
GLINT_UPDATE_FEED_URL="$update_feed_url" \
GLINT_PROVENANCE_FILE="$provenance" \
  bash scripts/package-desktop.sh

staging="$release_dir/staging"
mkdir -p "$staging"
cp -R applications/glint-desktop/dist/Glint.app "$staging/Glint.app"
timestamp="$(TZ=UTC date -r "$source_epoch" +%Y%m%d%H%M.%S)"
find "$staging/Glint.app" -exec touch -h -t "$timestamp" {} +
rm -f "$release_dir/$archive"
(
  cd "$staging"
  COPYFILE_DISABLE=1 zip -X -q -r -y "../$archive" Glint.app
)
rm -rf "$staging"
checksum="$(shasum -a 256 "$release_dir/$archive" | awk '{print $1}')"
printf '%s  %s\n' "$checksum" "$archive" > "$release_dir/SHA256SUMS"
cp THIRD_PARTY_NOTICES.md "$release_dir/"
cp THIRD_PARTY_NOTICES.md "$release_dir/SPECTACLE-LICENSE.md"

manifest_url="${download_base_url%/}/$archive"
printf '{\n  "version": "%s",\n  "url": "%s",\n  "sha256": "%s"\n}\n' \
  "$version" "$manifest_url" "$checksum" > "$release_dir/latest.json"

sed_version="$(printf '%s' "$version" | sed 's/[&|\\]/\\&/g')"
sed_url="$(printf '%s' "$manifest_url" | sed 's/[&|\\]/\\&/g')"
sed \
  -e "s|__VERSION__|$sed_version|g" \
  -e "s|__URL__|$sed_url|g" \
  -e "s|__SHA256__|$checksum|g" \
  -e "s|__ARCH_REQUIREMENT__|$cask_arch_requirement|g" \
  distribution/homebrew/Casks/glint.rb.template > "$release_dir/glint.rb"

codesign --verify --deep --strict applications/glint-desktop/dist/Glint.app
printf 'Release artifacts: %s\n' "$release_dir"
