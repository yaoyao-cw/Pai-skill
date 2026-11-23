#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
NODE_BIN="${BC_NODE:-}"

if [ -z "$NODE_BIN" ]; then
  NODE_BIN=$(command -v node || true)
fi

if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "Node.js 22+ with native fetch and WebSocket is required." >&2
  echo "Install Node.js 22+ on PATH or set BC_NODE=/path/to/node." >&2
  exit 1
fi

exec "$NODE_BIN" "$SCRIPT_DIR/bin/capture.cjs" "$@"
