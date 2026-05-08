#!/usr/bin/env bash
# deAIify for Claude Code: uninstaller.
# Removes the hook file and the Stop hook entry from settings.json.

set -euo pipefail

CLAUDE_DIR="${CLAUDE_HOME:-$HOME/.claude}"
HOOK_DEST="$CLAUDE_DIR/hooks/deaiify-stop.mjs"
SETTINGS="$CLAUDE_DIR/settings.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for settings patching. Install with 'brew install jq'." >&2
  exit 1
fi

if [ -f "$HOOK_DEST" ]; then
  rm "$HOOK_DEST"
  echo "[OK]  removed hook file -> $HOOK_DEST"
else
  echo "[--]  no hook file at $HOOK_DEST"
fi

if [ -f "$SETTINGS" ] && grep -q "deaiify-stop.mjs" "$SETTINGS"; then
  TMP="$(mktemp)"
  jq '
    if (.hooks.Stop // []) then
      .hooks.Stop |= [.[] | select((.hooks // []) | all(.command | test("deaiify-stop.mjs") | not))]
    else . end
    | if (.hooks.Stop // []) | length == 0 then del(.hooks.Stop) else . end
  ' "$SETTINGS" > "$TMP"
  mv "$TMP" "$SETTINGS"
  echo "[OK]  removed Stop hook entry from $SETTINGS"
else
  echo "[--]  no entry to remove from $SETTINGS"
fi

echo
echo "Uninstall complete."
