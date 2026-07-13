#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$COMPOSE_DIR")"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-120}"

echo "Starting Supermemory Local..."
cd "$COMPOSE_DIR"
docker compose up supermemory -d --build

CONTAINER_NAME="$(docker compose ps --format json supermemory 2>/dev/null | head -1 | sed -n 's/.*"Name":"\([^"]*\)".*/\1/p')"
if [[ -z "$CONTAINER_NAME" ]]; then
  CONTAINER_NAME="$(docker ps --filter publish=6767 --format '{{.Names}}' | head -1)"
fi

if [[ -z "$CONTAINER_NAME" ]]; then
  echo "Supermemory container not found. Check: docker compose -f $COMPOSE_DIR/docker-compose.yml ps"
  exit 1
fi

echo "Waiting for API key in logs ($CONTAINER_NAME)..."
DEADLINE=$((SECONDS + TIMEOUT_SECONDS))
API_KEY=""

while [[ $SECONDS -lt $DEADLINE ]]; do
  LOGS="$(docker logs "$CONTAINER_NAME" 2>&1 || true)"
  if [[ "$LOGS" =~ (sm_[a-zA-Z0-9_]+) ]]; then
    API_KEY="${BASH_REMATCH[1]}"
    break
  fi
  sleep 2
done

if [[ -z "$API_KEY" ]]; then
  echo "API key not found in logs yet. Run manually:"
  echo "  docker logs $CONTAINER_NAME"
  exit 1
fi

echo "Found API key: $API_KEY"

touch "$ENV_FILE"
grep -v -E '^\s*SUPERMEMORY_API_(URL|KEY)\s*=' "$ENV_FILE" > "${ENV_FILE}.tmp" || true
{
  cat "${ENV_FILE}.tmp"
  echo "SUPERMEMORY_API_URL=http://localhost:6767"
  echo "SUPERMEMORY_API_KEY=$API_KEY"
} > "$ENV_FILE"
rm -f "${ENV_FILE}.tmp"

echo "Wrote SUPERMEMORY_API_URL and SUPERMEMORY_API_KEY to $ENV_FILE"
echo ""
echo "Smoke test:"
echo "curl http://localhost:6767/v3/documents \\"
echo "  -H \"Authorization: Bearer $API_KEY\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"content\":\"Holocron hackathon test\",\"containerTag\":\"holocron_dev\"}'"
