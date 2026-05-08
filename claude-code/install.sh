#!/usr/bin/env bash
# deAIify for Claude Code: installer.
#
# Copies the Stop hook into ~/.claude/hooks/ and registers it in
# ~/.claude/settings.json. Idempotent: re-running is safe.

set -euo pipefail

HOOK_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deaiify-stop.mjs"
CLAUDE_DIR="${CLAUDE_HOME:-$HOME/.claude}"
HOOK_DEST="$CLAUDE_DIR/hooks/deaiify-stop.mjs"
SETTINGS="$CLAUDE_DIR/settings.json"

if [ ! -f "$HOOK_SRC" ]; then
  echo "ERROR: hook source not found at $HOOK_SRC" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for settings patching. Install with 'brew install jq'." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required (the hook is a Node script)." >&2
  exit 1
fi

mkdir -p "$CLAUDE_DIR/hooks"
cp "$HOOK_SRC" "$HOOK_DEST"
chmod +x "$HOOK_DEST"
echo "[OK]  installed hook -> $HOOK_DEST"

if [ ! -f "$SETTINGS" ]; then
  echo "[..] $SETTINGS not found. Creating minimal settings file."
  echo '{"hooks": {}}' > "$SETTINGS"
fi

if grep -q "deaiify-stop.mjs" "$SETTINGS"; then
  echo "[OK]  Stop hook already registered in $SETTINGS"
else
  TMP="$(mktemp)"
  jq --arg cmd "node $HOOK_DEST" '
    .hooks //= {}
    | .hooks.Stop //= []
    | .hooks.Stop += [{"hooks": [{"type": "command", "command": $cmd}]}]
  ' "$SETTINGS" > "$TMP"
  mv "$TMP" "$SETTINGS"
  echo "[OK]  patched $SETTINGS with Stop hook"
fi

echo
echo "Done. The hook fires on every assistant Stop event."
echo "If Claude slips an em-dash, en-dash, or ' -- ' into prose, it gets"
echo "blocked and forced to rewrite. Loop-safe via stop_hook_active."
echo "Fails open on any error."
echo
echo "To uninstall: ./uninstall.sh"
