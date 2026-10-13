#!/bin/bash
# Runs at the start of Claude Code on the web sessions. Sidechain has zero npm
# dependencies, so this only confirms Node is new enough and the code is healthy.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 18 ]; then echo "Sidechain needs Node 18+, found $(node -v)" >&2; exit 1; fi

# Install only if dependencies are ever added.
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; fi

npm run --silent check
echo "Sidechain ready: node $(node -v), syntax check passed. Run 'npm test' and 'npm start' (port 5173)."
