#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
LOCK_DIR="$STATE_DIR/deploy.lock"

mkdir "$LOCK_DIR" || { echo 'Another backup or deployment is running' >&2; exit 1; }
temporary=''
cleanup() {
  [[ -z "$temporary" ]] || rm -rf -- "$temporary"
  rm -f "$LOCK_DIR/pid"
  rmdir "$LOCK_DIR"
}
trap cleanup EXIT
printf '%s\n' "$$" >"$LOCK_DIR/pid"

backup="$(<"$STATE_DIR/last-backup")"
[[ "${backup%/*}" == "$STATE_DIR/backups" ]] || exit 1
[[ "${backup##*/}" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{7,40}$ ]] || exit 1
[[ "$(realpath -e "$backup")" == "$backup" ]] || exit 1

settings="${XDG_CONFIG_HOME:-$HOME/.config}/jano-periodic/settings"
if [[ -e "$settings" || -L "$settings" ]]; then
  [[ -f "$settings" && ! -L "$settings" && "$(stat -c '%u' "$settings")" == "$(id -u)" ]]
  (( (8#$(stat -c '%a' "$settings") & 8#077) == 0 ))
  set -a
  source "$settings"
  set +a
  : "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD_FILE:?}" "${JANO_PERIODIC_DIR:?}"
  [[ "$RESTIC_REPOSITORY" == "$JANO_PERIODIC_DIR/repo" ]]
  [[ -f "$RESTIC_PASSWORD_FILE" && ! -L "$RESTIC_PASSWORD_FILE" ]]
  [[ "$(stat -c '%u' "$RESTIC_PASSWORD_FILE")" == "$(id -u)" ]]
  (( (8#$(stat -c '%a' "$RESTIC_PASSWORD_FILE") & 8#077) == 0 ))
  snapshots="$(restic snapshots --json --host jano-production --tag periodic-verified)"
  snapshot="$(python3 -c 'import json,sys; rows=json.load(sys.stdin) or []; print(max(rows,key=lambda x:x["time"])["id"] if rows else "")' <<< "$snapshots")"
  if [[ -n "$snapshot" ]]; then
    [[ "$snapshot" =~ ^[0-9a-f]{8,64}$ ]]
    temporary="$(mktemp -d "$JANO_PERIODIC_DIR/export.XXXXXXXX")"
    restic dump "$snapshot" "$JANO_PERIODIC_DIR/capture/release.env" > "$temporary/release.env"
    mapfile -t created < <(sed -n 's/^CREATED_AT=\([0-9]\{8\}T[0-9]\{6\}Z\)$/\1/p' "$temporary/release.env")
    [[ "${#created[@]}" == 1 ]]
    if [[ "${created[0]}" > "${backup##*/}" ]]; then
      restic restore "$snapshot" --target "$temporary/restored" >&2
      capture="$temporary/restored$JANO_PERIODIC_DIR/capture"
      [[ -d "$capture/uploads" && ! -L "$capture/uploads" ]]
      for file in database.dump database.dump.sha256 database.list release.env; do
        [[ -f "$capture/$file" && ! -L "$capture/$file" ]]
      done
      (cd "$capture" && sha256sum --check database.dump.sha256 >&2)
      tar -C "$capture/uploads" -czf "$capture/uploads.tar.gz" .
      tar -tzf "$capture/uploads.tar.gz" >/dev/null
      (cd "$capture" && sha256sum uploads.tar.gz > uploads.tar.gz.sha256)
      backup="$capture"
    fi
  fi
fi
cd "$backup"
files=(database.dump database.dump.sha256 database.list uploads.tar.gz uploads.tar.gz.sha256 release.env)
for file in "${files[@]}"; do
  [[ -f "$file" && ! -L "$file" ]] || exit 1
done
sha256sum --check database.dump.sha256 >&2
sha256sum --check uploads.tar.gz.sha256 >&2
printf 'Exporting completed backup %s\n' "${backup##*/}" >&2
tar -cf - -- "${files[@]}"
