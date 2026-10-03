#!/bin/bash
# UserPromptSubmit hook: appends every prompt submitted in this project to PROMPT_LOG.md
# Input: hook JSON on stdin (fields used: prompt, session_id)

LOG_FILE="${CLAUDE_PROJECT_DIR:-$(pwd)}/PROMPT_LOG.md"
INPUT=$(cat)

PROMPT=$(printf '%s' "$INPUT" | jq -r '.prompt // empty')
SESSION=$(printf '%s' "$INPUT" | jq -r '.session_id // "unknown"')
[ -z "$PROMPT" ] && exit 0
# Skip automated background-task notifications; only log what the user typed.
case "$PROMPT" in
  "<task-notification>"*) exit 0 ;;
esac

if [ ! -f "$LOG_FILE" ]; then
  printf '# Prompt Log\n\nEvery prompt given to Claude Code while building this project, in order.\n' > "$LOG_FILE"
fi

{
  printf '\n---\n\n### %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
  printf '_Session: %s_\n\n' "$SESSION"
  printf '```text\n%s\n```\n' "$PROMPT"
} >> "$LOG_FILE"

exit 0
