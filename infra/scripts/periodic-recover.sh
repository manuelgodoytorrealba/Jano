#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
LOCK_DIR="$STATE_DIR/deploy.lock"
MARKER="$STATE_DIR/periodic-quiesced"
[[ -d "$LOCK_DIR" && -f "$LOCK_DIR/periodic-owner" && "$(<"$LOCK_DIR/periodic-owner")" == periodic ]] || exit 0
pid="$(<"$LOCK_DIR/pid")"
[[ "$pid" =~ ^[0-9]+$ ]]
if kill -0 "$pid" 2>/dev/null; then
  echo 'Periodic backup process still exists; refusing to remove its lock' >&2
  exit 1
fi
if [[ -e "$MARKER" ]]; then
  ENV_FILE="$ROOT_DIR/infra/.env.production"
  [[ -f "$ENV_FILE" && ! -L "$ENV_FILE" && "$(stat -c '%u' "$ENV_FILE")" == "$(id -u)" ]]
  (( (8#$(stat -c '%a' "$ENV_FILE") & 8#077) == 0 ))
  set -a
  source "$ENV_FILE"
  set +a
  JANO_RELEASE="$(<"$MARKER")"
  [[ "$JANO_RELEASE" =~ ^[0-9a-f]{7,40}$ ]]
  export JANO_RELEASE
  compose() { docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/infra/docker-compose.prod.yml" "$@"; }
  compose start backend frontend
  for service in backend frontend; do
    container="$(compose ps -q "$service")"
    [[ -n "$container" ]]
    for attempt in {1..120}; do
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")"
      [[ "$health" == healthy ]] && break
      [[ "$health" != exited && "$health" != dead && "$attempt" != 120 ]] || exit 1
      sleep 1
    done
  done
  rm -f "$MARKER"
fi
settings="${XDG_CONFIG_HOME:-$HOME/.config}/jano-periodic/settings"
[[ -f "$settings" && ! -L "$settings" && "$(stat -c '%u' "$settings")" == "$(id -u)" ]]
(( (8#$(stat -c '%a' "$settings") & 8#077) == 0 ))
source "$settings"
: "${JANO_PERIODIC_DIR:?}"
capture="$JANO_PERIODIC_DIR/capture"
if [[ -d "$capture" && ! -L "$capture" && -f "$capture/.periodic-owner" && "$(<"$capture/.periodic-owner")" == "$pid" ]]; then
  rm -rf -- "$capture"
fi
rm -f "$LOCK_DIR/pid" "$LOCK_DIR/periodic-owner"
rmdir "$LOCK_DIR"
