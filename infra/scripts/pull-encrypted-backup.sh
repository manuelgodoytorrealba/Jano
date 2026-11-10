#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

settings="${XDG_CONFIG_HOME:-$HOME/.config}/jano-backup/settings"
[[ -f "$settings" && ! -L "$settings" ]] || exit 1
mode="$(stat -c '%a' "$settings")"
(( (8#$mode & 8#077) == 0 )) || exit 1
[[ "$(stat -c '%u' "$settings")" == "$(id -u)" ]] || exit 1
set -a
# shellcheck disable=SC1090
source "$settings"
set +a
: "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD_FILE:?}" "${JANO_SSH_IDENTITY:?}" "${JANO_SSH_HOST:?}"

exec 9>"${XDG_RUNTIME_DIR:?}/jano-backup.lock"
flock -n 9 || exit 0
restic backup --host jano-production --tag coordinated-export \
  --stdin-filename jano-backup.tar --stdin-from-command -- \
  ssh -T -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o ControlPath=none -o ConnectTimeout=10 -i "$JANO_SSH_IDENTITY" "$JANO_SSH_HOST"
restic check --read-data
