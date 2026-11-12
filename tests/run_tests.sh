#!/bin/bash
set -eo pipefail

PORT=8788
CDP_PORT="${CDP_PORT:-9228}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Parse --port argument from command line if provided
args=("$@")
for ((i=0; i<${#args[@]}; i++)); do
  if [ "${args[i]}" == "--port" ] && [ -n "${args[i+1]}" ]; then
    CDP_PORT="${args[i+1]}"
  fi
done

# Pre-launch cleanup of any stale Chrome instance on targeted CDP_PORT
pkill -f "remote-debugging-port=$CDP_PORT" 2>/dev/null || true
sleep 0.2

# 1. Check if server.py is running on port 8788
SERVER_PID=""
if ! nc -z localhost $PORT 2>/dev/null; then
  echo "[TEST_RUNNER] Starting local server on http://localhost:$PORT..."
  python3 "$PROJECT_DIR/server.py" &
  SERVER_PID=$!
  sleep 1
fi

cleanup() {
  local exit_code=$?
  if [ -n "$SERVER_PID" ]; then
    echo "[TEST_RUNNER] Terminating background test server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  # Note: Chrome and tmp folders are managed exclusively by runner.js via PID.
  # We intentionally avoid running global `pkill -f` to prevent killing concurrent test runs.
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

# 2. Run Node.js E2E Test Suite
echo "[TEST_RUNNER] Executing E2E test suite..."
node "$PROJECT_DIR/tests/runner.js" "$@"
