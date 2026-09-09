#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root/brand/Glint.icon"

find . -type f -print | LC_ALL=C sort | while IFS= read -r file; do
  printf '%s ' "$file"
  shasum -a 256 "$file" | awk '{print $1}'
done | shasum -a 256 | awk '{print $1}'
