#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
LOCK_DIR="$STATE_DIR/deploy.lock"

mkdir "$LOCK_DIR" || { echo 'Another backup or deployment is running' >&2; exit 1; }
trap 'rm -f "$LOCK_DIR/pid"; rmdir "$LOCK_DIR"' EXIT
printf '%s\n' "$$" >"$LOCK_DIR/pid"

backup="$(<"$STATE_DIR/last-backup")"
[[ "${backup%/*}" == "$STATE_DIR/backups" ]] || exit 1
[[ "${backup##*/}" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{7,40}$ ]] || exit 1
[[ "$(realpath -e "$backup")" == "$backup" ]] || exit 1
cd "$backup"
files=(database.dump database.dump.sha256 database.list uploads.tar.gz uploads.tar.gz.sha256 release.env)
for file in "${files[@]}"; do
  [[ -f "$file" && ! -L "$file" ]] || exit 1
done
sha256sum --check database.dump.sha256 >&2
sha256sum --check uploads.tar.gz.sha256 >&2
printf 'Exporting completed backup %s\n' "${backup##*/}" >&2
tar -cf - -- "${files[@]}"
