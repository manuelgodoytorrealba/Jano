#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.prod.yml"
ENV_FILE="${JANO_ENV_FILE:-$ROOT_DIR/infra/.env.production}"
RELEASE=''
BACKUP_CREATED=''
LOCK_DIR=''

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  infra/scripts/prod.sh preflight [release]
  infra/scripts/prod.sh backup [release]
  infra/scripts/prod.sh healthcheck [release]
  infra/scripts/prod.sh deploy [release]
  infra/scripts/prod.sh rollback <release> --schema-compatible
  infra/scripts/prod.sh status [release]
  infra/scripts/prod.sh self-test
EOF
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

checksum() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  else
    shasum -a 256 "$1"
  fi
}

valid_release() {
  [[ "$1" =~ ^[0-9a-f]{7,40}$ ]]
}

load_environment() {
  [[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE; copy infra/.env.production.example first"

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  : "${COMPOSE_PROJECT_NAME:?COMPOSE_PROJECT_NAME is required}"
  : "${POSTGRES_VOLUME:?POSTGRES_VOLUME is required}"
  : "${UPLOADS_VOLUME:?UPLOADS_VOLUME is required}"
  : "${POSTGRES_USER:?POSTGRES_USER is required}"
  : "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
  : "${POSTGRES_DB:?POSTGRES_DB is required}"
  : "${DATABASE_URL:?DATABASE_URL is required}"
  : "${JWT_SECRET:?JWT_SECRET is required}"
  : "${FRONTEND_ORIGIN:?FRONTEND_ORIGIN is required}"
  : "${MEDIA_PUBLIC_BASE_URL:?MEDIA_PUBLIC_BASE_URL is required}"
  : "${NG_ALLOWED_HOSTS:?NG_ALLOWED_HOSTS is required}"

  JANO_BACKUP_DIR="${JANO_BACKUP_DIR:-/srv/backups/jano}"
  JANO_STATE_DIR="${JANO_STATE_DIR:-/srv/apps/jano/.deploy}"

  case "$POSTGRES_PASSWORD$JWT_SECRET$DATABASE_URL" in
    *replace-with* | *URL_ENCODED_PASSWORD*) die 'Production placeholders remain in the environment file' ;;
  esac
}

compose() {
  JANO_RELEASE="$RELEASE" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

select_release() {
  local requested="${1:-}"

  if [[ -n "$requested" ]]; then
    RELEASE="$requested"
  elif [[ -f "$JANO_STATE_DIR/current-release" ]]; then
    RELEASE="$(<"$JANO_STATE_DIR/current-release")"
  else
    RELEASE="$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)"
  fi

  valid_release "$RELEASE" || die "Invalid release: $RELEASE"
}

acquire_lock() {
  mkdir -p "$JANO_STATE_DIR"
  LOCK_DIR="$JANO_STATE_DIR/deploy.lock"
  mkdir "$LOCK_DIR" 2>/dev/null || die "Another production operation is running; inspect $LOCK_DIR"
  printf '%s\n' "$$" >"$LOCK_DIR/pid"
  trap 'rm -f "$LOCK_DIR/pid"; rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
}

wait_for_health() {
  local service="$1"
  local timeout="${2:-120}"
  local container deadline status

  container="$(compose ps -q "$service")"
  [[ -n "$container" ]] || die "$service container does not exist"
  deadline=$((SECONDS + timeout))

  while ((SECONDS < deadline)); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")"
    case "$status" in
      healthy) return 0 ;;
      exited | dead) die "$service stopped before becoming healthy" ;;
    esac
    sleep 2
  done

  compose logs --tail=100 "$service" >&2 || true
  die "$service did not become healthy within ${timeout}s"
}

preflight() {
  local require_clean="${1:-yes}"
  local env_mode
  require_command docker
  require_command git
  command -v sha256sum >/dev/null 2>&1 || require_command shasum
  require_command tar
  require_command curl

  if [[ "$require_clean" == 'yes' ]]; then
    [[ -z "$(git -C "$ROOT_DIR" status --porcelain)" ]] || die 'Git working tree is not clean'
  fi
  docker compose version >/dev/null
  docker volume inspect "$POSTGRES_VOLUME" >/dev/null || die "Database volume not found: $POSTGRES_VOLUME"
  docker volume inspect "$UPLOADS_VOLUME" >/dev/null || die "Uploads volume not found: $UPLOADS_VOLUME"
  compose config --quiet

  env_mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE")"
  ((8#$env_mode & 7 == 0)) || die "$ENV_FILE must not be readable by other users"

  mkdir -p "$JANO_BACKUP_DIR" "$JANO_STATE_DIR"
  [[ -w "$JANO_BACKUP_DIR" && -w "$JANO_STATE_DIR" ]] || die 'Backup or state directory is not writable'
  if [[ -n "${JANO_BACKUP_MIRROR:-}" ]]; then
    mkdir -p "$JANO_BACKUP_MIRROR"
    [[ -w "$JANO_BACKUP_MIRROR" ]] || die 'Backup mirror is not writable'
  fi

  local available_kb
  available_kb="$(df -Pk "$JANO_BACKUP_DIR" | awk 'NR==2 {print $4}')"
  if [[ -n "$available_kb" ]] && ((available_kb < 1048576)); then
    die 'Less than 1 GiB free in the backup filesystem'
  fi

  log "Preflight passed for release $RELEASE"
}

ensure_database() {
  compose up -d db
  wait_for_health db 90
}

backup() {
  local timestamp backup_dir dump_tmp uploads_tmp verify_file
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="$JANO_BACKUP_DIR/${timestamp}-${RELEASE}"
  dump_tmp="$backup_dir/database.dump.tmp"
  uploads_tmp="$backup_dir/uploads.tar.gz.tmp"
  verify_file="jano-${timestamp}.dump"

  mkdir -p "$backup_dir"
  log "Creating PostgreSQL backup in $backup_dir"

  compose exec -T db sh -eu -c \
    'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
    >"$dump_tmp"
  [[ -s "$dump_tmp" ]] || die 'PostgreSQL backup is empty'

  compose cp "$dump_tmp" "db:/tmp/$verify_file" >/dev/null
  compose exec -T db pg_restore --list "/tmp/$verify_file" >"$backup_dir/database.list"
  compose exec -T db rm -f "/tmp/$verify_file"
  mv "$dump_tmp" "$backup_dir/database.dump"
  (cd "$backup_dir" && checksum database.dump >database.dump.sha256)

  log 'Creating uploads backup'
  docker run --rm --volume "$UPLOADS_VOLUME:/data:ro" postgres:16 \
    tar -C /data -czf - . >"$uploads_tmp"
  tar -tzf "$uploads_tmp" >/dev/null
  mv "$uploads_tmp" "$backup_dir/uploads.tar.gz"
  (cd "$backup_dir" && checksum uploads.tar.gz >uploads.tar.gz.sha256)

  printf 'JANO_RELEASE=%s\nCREATED_AT=%s\n' "$RELEASE" "$timestamp" >"$backup_dir/release.env"

  if [[ -n "${JANO_BACKUP_MIRROR:-}" ]]; then
    mkdir -p "$JANO_BACKUP_MIRROR"
    cp -a "$backup_dir" "$JANO_BACKUP_MIRROR/"
    log "Backup copied to $JANO_BACKUP_MIRROR"
  else
    log 'WARNING: JANO_BACKUP_MIRROR is not configured; copy this backup off-server'
  fi

  BACKUP_CREATED="$backup_dir"
  log "Verified backup created: $backup_dir"
}

run_migrations() {
  log 'Checking migration status before deploy'
  compose run --rm migrate npx prisma migrate status
  log 'Applying pending migrations'
  compose run --rm migrate
  log 'Checking migration status after deploy'
  compose run --rm migrate npx prisma migrate status
}

healthcheck() {
  wait_for_health backend 120
  wait_for_health frontend 120

  compose exec -T backend node -e \
    "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
  compose exec -T frontend node -e \
    "fetch('http://127.0.0.1:4200/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

  if [[ -n "${JANO_PUBLIC_URL:-}" ]]; then
    curl --fail --silent --show-error --max-time 15 "${JANO_PUBLIC_URL%/}/healthz" >/dev/null
    curl --fail --silent --show-error --max-time 15 "${JANO_PUBLIC_URL%/}/api/health/ready" >/dev/null
  fi

  log "Healthcheck passed for release $RELEASE"
}

record_release() {
  local previous="${1:-}"
  mkdir -p "$JANO_STATE_DIR"
  [[ -z "$previous" ]] || printf '%s\n' "$previous" >"$JANO_STATE_DIR/previous-release.tmp"
  printf '%s\n' "$RELEASE" >"$JANO_STATE_DIR/current-release.tmp"
  [[ -z "$BACKUP_CREATED" ]] || printf '%s\n' "$BACKUP_CREATED" >"$JANO_STATE_DIR/last-backup.tmp"

  [[ ! -f "$JANO_STATE_DIR/previous-release.tmp" ]] || mv "$JANO_STATE_DIR/previous-release.tmp" "$JANO_STATE_DIR/previous-release"
  mv "$JANO_STATE_DIR/current-release.tmp" "$JANO_STATE_DIR/current-release"
  [[ ! -f "$JANO_STATE_DIR/last-backup.tmp" ]] || mv "$JANO_STATE_DIR/last-backup.tmp" "$JANO_STATE_DIR/last-backup"
}

deploy_failed() {
  local exit_code=$?
  log 'ERROR: deployment stopped. Writes remain disabled if the application was already stopped.' >&2
  compose ps >&2 || true
  compose logs --tail=80 backend frontend migrate >&2 || true
  exit "$exit_code"
}

deploy() {
  local previous=''
  trap deploy_failed ERR

  preflight
  acquire_lock
  [[ ! -f "$JANO_STATE_DIR/current-release" ]] || previous="$(<"$JANO_STATE_DIR/current-release")"

  log "Building immutable images for $RELEASE"
  compose build --pull backend frontend
  docker image inspect "jano-backend:$RELEASE" "jano-frontend:$RELEASE" >/dev/null

  ensure_database
  compose --profile tools stop adminer || true
  log 'Stopping application writes before backup and migration'
  compose stop frontend backend || true
  backup
  run_migrations

  compose up -d --no-deps backend
  wait_for_health backend 120
  compose up -d --no-deps frontend
  healthcheck
  record_release "$previous"
  trap - ERR

  log "Deployment complete: $RELEASE"
}

rollback() {
  local target="$1"
  local confirmation="${2:-}"
  [[ "$confirmation" == '--schema-compatible' ]] || die 'Rollback requires --schema-compatible confirmation'

  preflight
  acquire_lock
  docker image inspect "jano-backend:$target" "jano-frontend:$target" >/dev/null || die "Images for $target are not available"

  local current=''
  [[ ! -f "$JANO_STATE_DIR/current-release" ]] || current="$(<"$JANO_STATE_DIR/current-release")"
  RELEASE="$target"

  log "Rolling application back to $RELEASE without changing PostgreSQL"
  compose stop frontend backend || true
  compose up -d --no-deps backend
  wait_for_health backend 120
  compose up -d --no-deps frontend
  healthcheck
  record_release "$current"
  log "Application rollback complete: $RELEASE"
}

self_test() {
  valid_release abcdef1 || die 'Valid release rejected'
  if valid_release 'not-a-release'; then
    die 'Invalid release accepted'
  fi
  log 'Self-test passed'
}

main() {
  local command="${1:-}"
  local requested_release="${2:-}"

  if [[ "$command" == 'self-test' ]]; then
    self_test
    return
  fi

  [[ -n "$command" ]] || {
    usage
    exit 1
  }

  cd "$ROOT_DIR"
  load_environment
  select_release "$requested_release"

  case "$command" in
    preflight) preflight ;;
    backup)
      preflight no
      acquire_lock
      ensure_database
      backup
      ;;
    healthcheck) healthcheck ;;
    deploy) deploy ;;
    rollback)
      [[ -n "$requested_release" ]] || die 'Rollback release is required'
      rollback "$requested_release" "${3:-}"
      ;;
    status) compose ps ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
