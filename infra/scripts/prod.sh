#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.prod.yml"
ENV_FILE="${JANO_ENV_FILE:-$ROOT_DIR/infra/.env.production}"
RELEASE=''
BACKUP_CREATED=''
LOCK_DIR=''
ROLLBACK_RECOVERY_RELEASE=''

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
  infra/scripts/prod.sh backup [release] --writes-stopped
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

checksum_check() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum --check "$1"
  else
    shasum -a 256 --check "$1"
  fi
}

valid_release() {
  [[ "$1" =~ ^[0-9a-f]{7,40}$ ]]
}

load_environment() {
  [[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE; copy infra/.env.production.example first"

  local env_mode
  [[ ! -L "$ENV_FILE" ]] || die "$ENV_FILE must be a regular file, not a symlink"
  env_mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE")"
  (( (8#$env_mode & 8#077) == 0 )) || die "$ENV_FILE must not grant permissions to group or other users (current mode: $env_mode)"

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
  APP_PUBLIC_URL="${APP_PUBLIC_URL:-$JANO_PUBLIC_URL}"
  export APP_PUBLIC_URL
  : "${MEDIA_PUBLIC_BASE_URL:?MEDIA_PUBLIC_BASE_URL is required}"
  : "${NG_ALLOWED_HOSTS:?NG_ALLOWED_HOSTS is required}"
  : "${JANO_PUBLIC_URL:?JANO_PUBLIC_URL is required}"
  : "${MAIL_PROVIDER:?MAIL_PROVIDER is required}"
  : "${MAIL_FROM:?MAIL_FROM is required}"
  : "${RESEND_API_KEY:?RESEND_API_KEY is required}"

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

verify_service_volume_if_present() {
  local service="$1"
  local destination="$2"
  local expected_volume="$3"
  local container actual_volume

  container="$(compose ps -aq "$service")"
  [[ -n "$container" ]] || return 0
  actual_volume="$(docker inspect --format "{{range .Mounts}}{{if eq .Destination \"$destination\"}}{{.Name}}{{end}}{{end}}" "$container")"
  [[ "$actual_volume" == "$expected_volume" ]] || \
    die "$service uses ${actual_volume:-no volume} at $destination; expected $expected_volume"
}

validate_database_url_configuration() {
  node <<'NODE'
const url = new URL(process.env.DATABASE_URL);
const failures = [];
if (!['postgres:', 'postgresql:'].includes(url.protocol)) failures.push('protocol must be postgresql');
if (url.hostname !== 'db') failures.push('hostname must be db');
if (url.port && url.port !== '5432') failures.push('port must be 5432');
if (decodeURIComponent(url.username) !== process.env.POSTGRES_USER) failures.push('username differs from POSTGRES_USER');
if (decodeURIComponent(url.password) !== process.env.POSTGRES_PASSWORD) failures.push('password differs from POSTGRES_PASSWORD');
if (decodeURIComponent(url.pathname.replace(/^\//, '')) !== process.env.POSTGRES_DB) failures.push('database differs from POSTGRES_DB');
if (failures.length) {
  console.error(`Invalid DATABASE_URL: ${failures.join('; ')}`);
  process.exit(1);
}
NODE
}

preflight() {
  local require_clean="${1:-yes}"
  local require_head_release="${2:-yes}"
  local env_mode head_commit
  require_command docker
  require_command git
  require_command node
  command -v sha256sum >/dev/null 2>&1 || require_command shasum
  require_command tar
  require_command curl

  if [[ "$require_clean" == 'yes' ]]; then
    [[ -z "$(git -C "$ROOT_DIR" status --porcelain)" ]] || die 'Git working tree is not clean'
  fi
  if [[ "$require_head_release" == 'yes' ]]; then
    head_commit="$(git -C "$ROOT_DIR" rev-parse HEAD)"
    [[ "$head_commit" == "$RELEASE"* ]] || die "Release $RELEASE is not the current Git commit $head_commit"
  fi
  validate_database_url_configuration
  docker compose version >/dev/null
  docker volume inspect "$POSTGRES_VOLUME" >/dev/null || die "Database volume not found: $POSTGRES_VOLUME"
  docker volume inspect "$UPLOADS_VOLUME" >/dev/null || die "Uploads volume not found: $UPLOADS_VOLUME"
  compose config --quiet
  verify_service_volume_if_present db /var/lib/postgresql/data "$POSTGRES_VOLUME"
  verify_service_volume_if_present backend /app/backend/api/uploads "$UPLOADS_VOLUME"

  env_mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE")"
  (( (8#$env_mode & 8#077) == 0 )) || die "$ENV_FILE must not grant permissions to group or other users"

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

verify_database_volume() {
  local container actual_volume
  container="$(compose ps -q db)"
  [[ -n "$container" ]] || die "Database container does not exist"
  actual_volume="$(docker inspect --format "{{range .Mounts}}{{if eq .Destination \"/var/lib/postgresql/data\"}}{{.Name}}{{end}}{{end}}" "$container")"
  [[ "$actual_volume" == "$POSTGRES_VOLUME" ]] || die "Database container uses ${actual_volume:-no volume}; expected $POSTGRES_VOLUME"
}

ensure_database() {
  compose up -d db
  wait_for_health db 90
  verify_database_volume
}

validate_database_access() {
  log "Validating production DATABASE_URL against PostgreSQL"
  compose run --rm --no-deps migrate node -e "const { Pool } = require(\"pg\"); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query(\"SELECT 1\").then(() => pool.end()).catch((error) => { console.error(error.message); process.exit(1); });"
}

assert_application_writes_stopped() {
  local service container running
  for service in backend adminer; do
    container="$(compose ps -aq "$service")"
    [[ -n "$container" ]] || continue
    running="$(docker inspect --format "{{.State.Running}}" "$container")"
    [[ "$running" == "false" ]] || die "$service is still running; refusing a coordinated backup"
  done
}

backup() {
  local timestamp backup_dir final_backup_dir dump_tmp uploads_tmp verify_file backend_image_id frontend_image_id
  assert_application_writes_stopped
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  final_backup_dir="$JANO_BACKUP_DIR/${timestamp}-${RELEASE}"
  backup_dir="${final_backup_dir}.partial"
  dump_tmp="$backup_dir/database.dump.tmp"
  uploads_tmp="$backup_dir/uploads.tar.gz.tmp"
  verify_file="jano-${timestamp}.dump"

  mkdir "$backup_dir" || die "Backup path already exists: $backup_dir"
  log "Creating PostgreSQL backup in $backup_dir"

  compose exec -T db sh -eu -c \
    'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
    >"$dump_tmp"
  [[ -s "$dump_tmp" ]] || die 'PostgreSQL backup is empty'

  compose cp "$dump_tmp" "db:/tmp/$verify_file" >/dev/null
  if ! compose exec -T db pg_restore --list "/tmp/$verify_file" >"$backup_dir/database.list"; then
    compose exec -T db rm -f "/tmp/$verify_file" || true
    die "PostgreSQL backup validation failed"
  fi
  compose exec -T db rm -f "/tmp/$verify_file"
  mv "$dump_tmp" "$backup_dir/database.dump"
  (cd "$backup_dir" && checksum database.dump >database.dump.sha256)
  (cd "$backup_dir" && checksum_check database.dump.sha256 >/dev/null)

  log 'Creating uploads backup'
  docker run --rm --pull=never --volume "$UPLOADS_VOLUME:/data:ro" postgres:16 \
    tar -C /data -czf - . >"$uploads_tmp"
  tar -tzf "$uploads_tmp" >/dev/null
  mv "$uploads_tmp" "$backup_dir/uploads.tar.gz"
  (cd "$backup_dir" && checksum uploads.tar.gz >uploads.tar.gz.sha256)
  (cd "$backup_dir" && checksum_check uploads.tar.gz.sha256 >/dev/null)

  backend_image_id="$(docker image inspect --format '{{.Id}}' "jano-backend:$RELEASE")"
  frontend_image_id="$(docker image inspect --format '{{.Id}}' "jano-frontend:$RELEASE")"
  printf 'JANO_RELEASE=%s\nCREATED_AT=%s\nPOSTGRES_VOLUME=%s\nUPLOADS_VOLUME=%s\nBACKEND_IMAGE_ID=%s\nFRONTEND_IMAGE_ID=%s\n' \
    "$RELEASE" "$timestamp" "$POSTGRES_VOLUME" "$UPLOADS_VOLUME" "$backend_image_id" "$frontend_image_id" \
    >"$backup_dir/release.env"

  mv "$backup_dir" "$final_backup_dir"
  backup_dir="$final_backup_dir"

  if [[ -n "${JANO_BACKUP_MIRROR:-}" ]]; then
    mkdir -p "$JANO_BACKUP_MIRROR"
    [[ ! -e "$JANO_BACKUP_MIRROR/$(basename "$backup_dir")" ]] || die "Backup mirror path already exists"
    cp -a "$backup_dir" "$JANO_BACKUP_MIRROR/"
    (cd "$JANO_BACKUP_MIRROR/$(basename "$backup_dir")" && checksum_check database.dump.sha256 >/dev/null)
    (cd "$JANO_BACKUP_MIRROR/$(basename "$backup_dir")" && checksum_check uploads.tar.gz.sha256 >/dev/null)
    log "Backup copied to $JANO_BACKUP_MIRROR"
  else
    log 'WARNING: JANO_BACKUP_MIRROR is not configured; copy this backup off-server'
  fi

  BACKUP_CREATED="$backup_dir"
  log "Verified backup created: $backup_dir"
}

validate_release_artifacts() {
  log "Validating Prisma schema packaged in the release image"
  compose run --rm --no-deps migrate npm exec -- prisma validate
}

run_migrations() {
  log "Applying pending migrations with the one-shot release service"
  compose run --rm --no-deps migrate
  log "Checking migration status after deploy"
  compose run --rm --no-deps migrate npm exec -- prisma migrate status
}

healthcheck() {
  wait_for_health backend 120
  wait_for_health frontend 120

  compose exec -T backend node -e \
    "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
  compose exec -T frontend node -e \
    "fetch('http://127.0.0.1:4200/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

  log "Container healthchecks passed for release $RELEASE"
}

smoke_tests() {
  local public_url="${JANO_PUBLIC_URL%/}"
  log "Running public smoke tests against $public_url"
  curl --fail --silent --show-error --max-time 15 "$public_url/healthz" >/dev/null
  curl --fail --silent --show-error --max-time 15 "$public_url/api/health/live" >/dev/null
  curl --fail --silent --show-error --max-time 15 "$public_url/api/health/ready" >/dev/null
  log "Public smoke tests passed for release $RELEASE"
}

record_release() {
  local previous="${1:-}"
  local backend_image_id frontend_image_id
  backend_image_id="$(docker image inspect --format '{{.Id}}' "jano-backend:$RELEASE")"
  frontend_image_id="$(docker image inspect --format '{{.Id}}' "jano-frontend:$RELEASE")"
  mkdir -p "$JANO_STATE_DIR"
  printf '%s\n' "$RELEASE" >"$JANO_STATE_DIR/current-release.tmp"
  [[ -z "$BACKUP_CREATED" ]] || printf '%s\n' "$BACKUP_CREATED" >"$JANO_STATE_DIR/last-backup.tmp"
  printf 'JANO_RELEASE=%s\nBACKEND_IMAGE_ID=%s\nFRONTEND_IMAGE_ID=%s\nRECORDED_AT=%s\n' \
    "$RELEASE" "$backend_image_id" "$frontend_image_id" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    >"$JANO_STATE_DIR/release-${RELEASE}.env.tmp"

  if [[ -n "$previous" ]]; then
    printf '%s\n' "$previous" >"$JANO_STATE_DIR/previous-release.tmp"
    mv "$JANO_STATE_DIR/previous-release.tmp" "$JANO_STATE_DIR/previous-release"
  else
    rm -f "$JANO_STATE_DIR/previous-release" "$JANO_STATE_DIR/previous-release.tmp"
  fi
  mv "$JANO_STATE_DIR/current-release.tmp" "$JANO_STATE_DIR/current-release"
  mv "$JANO_STATE_DIR/release-${RELEASE}.env.tmp" "$JANO_STATE_DIR/release-${RELEASE}.env"
  [[ ! -f "$JANO_STATE_DIR/last-backup.tmp" ]] || mv "$JANO_STATE_DIR/last-backup.tmp" "$JANO_STATE_DIR/last-backup"
}

deploy_failed() {
  local exit_code=$?
  trap - ERR
  log 'ERROR: deployment stopped. Writes remain disabled if the application was already stopped.' >&2
  compose ps >&2 || true
  compose logs --tail=80 backend frontend migrate >&2 || true
  exit "$exit_code"
}

validate_release_images() {
  local backend_image="jano-backend:$RELEASE"
  local frontend_image="jano-frontend:$RELEASE"
  local image revision command

  for image in "$backend_image" "$frontend_image"; do
    docker image inspect "$image" >/dev/null 2>&1 || die "Missing release image: $image"
    revision="$(docker image inspect --format "{{index .Config.Labels \"org.opencontainers.image.revision\"}}" "$image")"
    [[ "$revision" == "$RELEASE" ]] || die "$image revision is ${revision:-missing}; expected $RELEASE"
  done

  command="$(docker image inspect --format "{{json .Config.Cmd}}" "$backend_image")"
  [[ "$command" == *"dist/src/main.js"* && "$command" != *"start:dev"* ]] || die "Invalid backend runtime command: $command"
  command="$(docker image inspect --format "{{json .Config.Cmd}}" "$frontend_image")"
  [[ "$command" == *"serve:ssr:jano-web-app"* && "$command" != *"start:dev"* ]] || die "Invalid frontend runtime command: $command"
}

build_images() {
  local backend_image="jano-backend:$RELEASE"
  local frontend_image="jano-frontend:$RELEASE"

  if docker image inspect "$backend_image" "$frontend_image" >/dev/null 2>&1; then
    validate_release_images
    log "Reusing validated images for immutable release $RELEASE"
    return
  fi
  if docker image inspect "$backend_image" >/dev/null 2>&1 || docker image inspect "$frontend_image" >/dev/null 2>&1; then
    die "Only one release image exists for $RELEASE; refusing an incomplete release"
  fi

  log "Building immutable images for $RELEASE"
  compose build --pull backend frontend
  validate_release_images
}

deploy() {
  local previous=''
  trap deploy_failed ERR

  acquire_lock
  preflight yes yes
  if [[ -f "$JANO_STATE_DIR/current-release" ]]; then
    previous="$(<"$JANO_STATE_DIR/current-release")"
    valid_release "$previous" || die "Invalid recorded current release: $previous"
    log "Current production release is $previous"
  else
    log "No production release is recorded; performing the first production deployment"
  fi

  build_images
  validate_release_artifacts

  compose --profile tools stop adminer || true
  log 'Stopping application writes before database adoption, backup and migration'
  compose stop frontend backend
  ensure_database
  validate_database_access
  backup
  run_migrations

  compose up -d --no-deps backend
  wait_for_health backend 120
  compose up -d --no-deps frontend
  healthcheck
  smoke_tests
  record_release "$previous"
  trap - ERR

  log "Deployment complete: $RELEASE"
}

rollback_failed() {
  local exit_code=$?
  trap - ERR
  log "ERROR: rollback to $RELEASE failed; restoring application release $ROLLBACK_RECOVERY_RELEASE" >&2

  if valid_release "$ROLLBACK_RECOVERY_RELEASE" && \
    docker image inspect "jano-backend:$ROLLBACK_RECOVERY_RELEASE" "jano-frontend:$ROLLBACK_RECOVERY_RELEASE" >/dev/null 2>&1; then
    RELEASE="$ROLLBACK_RECOVERY_RELEASE"
    if compose up -d --no-deps backend && \
      wait_for_health backend 120 && \
      compose up -d --no-deps frontend && \
      healthcheck && smoke_tests; then
      log "Recovered application release $RELEASE" >&2
    else
      log "ERROR: automatic recovery of $RELEASE failed; manual intervention is required" >&2
    fi
  fi

  exit "$exit_code"
}

rollback() {
  local target="$1"
  local confirmation="${2:-}"
  local current
  [[ "$confirmation" == '--schema-compatible' ]] || die 'Rollback requires --schema-compatible confirmation'

  acquire_lock
  preflight no no
  [[ -f "$JANO_STATE_DIR/current-release" ]] || die 'No current production release is recorded; first deployment cannot use rollback'
  current="$(<"$JANO_STATE_DIR/current-release")"
  valid_release "$current" || die "Invalid current release: $current"
  [[ "$target" != "$current" ]] || die "$target is already the current release"
  RELEASE="$target"
  validate_release_images
  ROLLBACK_RECOVERY_RELEASE="$current"
  trap rollback_failed ERR

  log "Rolling application back to $RELEASE without changing PostgreSQL"
  compose stop frontend backend
  compose up -d --no-deps backend
  wait_for_health backend 120
  compose up -d --no-deps frontend
  healthcheck
  smoke_tests
  record_release "$current"
  trap - ERR
  log "Application rollback complete: $RELEASE"
}

self_test() {
  local mode
  valid_release abcdef1 || die 'Valid release rejected'
  if valid_release 'not-a-release'; then
    die 'Invalid release accepted'
  fi

  for mode in 400 600 700; do
    (( (8#$mode & 8#077) == 0 )) || die "Secure mode $mode was rejected"
  done
  for mode in 604 640 660 666; do
    if (( (8#$mode & 8#077) == 0 )); then
      die "Insecure mode $mode was accepted"
    fi
  done
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
      [[ "${3:-}" == '--writes-stopped' ]] || die 'Backup requires --writes-stopped confirmation'
      acquire_lock
      preflight no no
      validate_release_images
      assert_application_writes_stopped
      ensure_database
      validate_database_access
      backup
      ;;
    healthcheck)
      healthcheck
      smoke_tests
      ;;
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
