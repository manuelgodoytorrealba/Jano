#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
LOCK_DIR="$STATE_DIR/deploy.lock"
MARKER="$STATE_DIR/periodic-quiesced"
SETTINGS="${XDG_CONFIG_HOME:-$HOME/.config}/jano-periodic/settings"
ENV_FILE="$ROOT_DIR/infra/.env.production"

for file in "$ENV_FILE" "$SETTINGS"; do
  [[ -f "$file" && ! -L "$file" && "$(stat -c '%u' "$file")" == "$(id -u)" ]]
  mode="$(stat -c '%a' "$file")"
  (( (8#$mode & 8#077) == 0 ))
done
set -a
source "$ENV_FILE"
source "$SETTINGS"
set +a
: "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD_FILE:?}" "${JANO_PERIODIC_DIR:?}" "${UPLOADS_VOLUME:?}" "${POSTGRES_VOLUME:?}"
[[ "$RESTIC_REPOSITORY" == "$JANO_PERIODIC_DIR/repo" ]]
[[ -f "$RESTIC_PASSWORD_FILE" && ! -L "$RESTIC_PASSWORD_FILE" ]]
[[ "$(stat -c '%u' "$RESTIC_PASSWORD_FILE")" == "$(id -u)" ]]
(( (8#$(stat -c '%a' "$RESTIC_PASSWORD_FILE") & 8#077) == 0 ))
[[ -f "$STATE_DIR/current-release" ]]
JANO_RELEASE="$(<"$STATE_DIR/current-release")"
[[ "$JANO_RELEASE" =~ ^[0-9a-f]{7,40}$ ]]
export JANO_RELEASE
compose() { docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/infra/docker-compose.prod.yml" "$@"; }

capture="$JANO_PERIODIC_DIR/capture"
[[ -d "$JANO_PERIODIC_DIR" && ! -L "$JANO_PERIODIC_DIR" && "$(stat -c '%u' "$JANO_PERIODIC_DIR")" == "$(id -u)" && ! -e "$capture" && ! -e "$MARKER" ]]
(( (8#$(stat -c '%a' "$JANO_PERIODIC_DIR") & 8#077) == 0 ))
free_kb="$(df -Pk "$JANO_PERIODIC_DIR" | awk 'NR==2 {print $4}')"
(( free_kb >= 4194304 )) || { echo 'Less than 4 GiB free for a coordinated backup' >&2; exit 1; }
mkdir "$LOCK_DIR" || { echo 'Another backup or deployment is running' >&2; exit 1; }
printf '%s\n' "$$" > "$LOCK_DIR/pid"
printf '%s\n' periodic > "$LOCK_DIR/periodic-owner"

restart_services() {
  local service container health attempt backend_id frontend_id
  backend_id="$(compose ps -aq backend)" || return 1
  frontend_id="$(compose ps -aq frontend)" || return 1
  [[ -n "$backend_id" && -n "$frontend_id" ]] || return 1
  docker start "$backend_id" "$frontend_id" || return 1
  for service in backend frontend; do
    container="$(compose ps -q "$service")" || return 1
    [[ -n "$container" ]] || return 1
    for attempt in {1..120}; do
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")" || return 1
      [[ "$health" == healthy ]] && break
      [[ "$health" != exited && "$health" != dead && "$attempt" != 120 ]] || return 1
      sleep 1
    done
  done
}

cleanup() {
  local status=$?
  trap - EXIT
  if [[ -e "$MARKER" ]]; then
    if restart_services; then
      rm -f "$MARKER"
    else
      echo 'ERROR: failed to restart JANO; keeping recovery marker and lock' >&2
      status=1
    fi
  fi
  if [[ ! -e "$MARKER" ]]; then
    if [[ -d "$capture" && ! -L "$capture" && -f "$capture/.periodic-owner" && "$(<"$capture/.periodic-owner")" == "$$" ]]; then
      rm -rf -- "$capture" || status=1
    fi
    rm -f "$LOCK_DIR/pid" "$LOCK_DIR/periodic-owner"
    rmdir "$LOCK_DIR" || status=1
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 1' INT TERM HUP

for service in backend frontend db; do
  container="$(compose ps -q "$service")"
  [[ -n "$container" && "$(docker inspect --format '{{.State.Running}}' "$container")" == true ]]
done
adminer="$(compose ps -q adminer)"
[[ -z "$adminer" || "$(docker inspect --format '{{.State.Running}}' "$adminer")" == false ]]
backend="$(compose ps -q backend)"
[[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/backend/api/uploads"}}{{.Name}}{{end}}{{end}}' "$backend")" == "$UPLOADS_VOLUME" ]]
database="$(compose ps -q db)"
[[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$database")" == "$POSTGRES_VOLUME" ]]
for container in $(docker ps -q --no-trunc --filter "volume=$UPLOADS_VOLUME"); do
  [[ "$container" == "$backend" ]] || { echo 'Another container is using the uploads volume' >&2; exit 1; }
done

mkdir -m 700 "$capture"
printf '%s\n' "$$" > "$capture/.periodic-owner"
mkdir -m 700 "$capture/uploads"
sync_uploads() {
  docker run --rm --pull=never --network none \
    --volume "$UPLOADS_VOLUME:/data:ro" \
    --mount "type=bind,src=$capture/uploads,dst=/stage" \
    --mount type=bind,src=/usr/bin/rsync,dst=/usr/local/bin/rsync,readonly \
    --mount type=bind,src=/lib/x86_64-linux-gnu/libpopt.so.0,dst=/usr/lib/x86_64-linux-gnu/libpopt.so.0,readonly \
    --entrypoint /usr/local/bin/rsync postgres:16.15-trixie \
    -a --delete --chown="$(id -u):$(id -g)" "$@" /data/ /stage/
}
echo 'Preparing uploads while JANO is running'
sync_uploads
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
pause_started="$(date +%s%3N)"
printf '%s\n' "$JANO_RELEASE" > "$MARKER"
compose stop frontend backend
compose exec -T db sh -eu -c 'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$capture/database.dump"
[[ -s "$capture/database.dump" ]]
sync_uploads --checksum
restart_services
rm -f "$MARKER"
printf 'Application available after %s ms\n' "$(($(date +%s%3N)-pause_started))"

docker run --rm --pull=never --network none -i postgres:16.15-trixie pg_restore --list < "$capture/database.dump" > "$capture/database.list"
printf 'JANO_RELEASE=%s\nCREATED_AT=%s\n' "$JANO_RELEASE" "$timestamp" > "$capture/release.env"
(cd "$capture" && sha256sum database.dump > database.dump.sha256)
restic backup --force --json --host jano-production --tag periodic-pending "$capture" > "$JANO_PERIODIC_DIR/last-run.json"
snapshot="$(python3 -c 'import json,sys; rows=[json.loads(x) for x in open(sys.argv[1])]; ids=[x.get("snapshot_id") for x in rows if x.get("message_type")=="summary"]; assert len(ids)==1 and ids[0]; print(ids[0])' "$JANO_PERIODIC_DIR/last-run.json")"
[[ "$snapshot" =~ ^[0-9a-f]{8,64}$ ]]
restic check --read-data
restic tag --add periodic-verified --remove periodic-pending "$snapshot"
rm -rf -- "$capture"
echo "Verified coordinated snapshot created at $timestamp"
