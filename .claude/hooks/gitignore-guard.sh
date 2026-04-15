#!/usr/bin/env bash
# gitignore-guard.sh — Data-driven hook that warns when .gitignore lacks patterns
# required by the project's stack. Consumes .claude/hooks/data/gitignore-stack-minimums.json
# as the single source of truth — NEVER hardcodes stack rules in this script.
#
# Runs on:
#   - SessionStart: warn once at session boot when .gitignore is missing patterns
#   - PostToolUse Bash: warn when `git add` is detected and gitignore lacks stack patterns
#   - PostToolUse Edit|Write|MultiEdit: warn when a file is created/edited whose path
#     matches a pattern the gitignore SHOULD have (so the new file becomes trackable by
#     mistake) OR when any required pattern for the current stack is still missing
#
# Behavior:
#   - Always informational (exit 0 with warning message to stderr). Never blocks.
#   - Requires jq. If jq is not installed, exits silently (no-op).
#   - Requires the data file. If absent, exits silently (hook is opt-in via data file presence).
#   - Scoped to the current repo's root (git rev-parse). Outside a repo → no-op.

set -u

# --- Preconditions ---------------------------------------------------------
command -v jq >/dev/null 2>&1 || exit 0

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -d "$REPO_ROOT" ] || exit 0

DATA_FILE="$REPO_ROOT/.claude/hooks/data/gitignore-stack-minimums.json"
[ -f "$DATA_FILE" ] || exit 0

jq empty "$DATA_FILE" >/dev/null 2>&1 || exit 0

GITIGNORE="$REPO_ROOT/.gitignore"

# --- Parse event payload ---------------------------------------------------
# Claude Code passes event JSON on stdin. We read it to detect hook event type
# and, for PostToolUse Bash events, the command that ran.
PAYLOAD="$(cat 2>/dev/null || true)"
EVENT_TYPE="$(printf '%s' "$PAYLOAD" | jq -r '.hook_event_name // empty' 2>/dev/null || true)"
TOOL_NAME="$(printf '%s' "$PAYLOAD" | jq -r '.tool_name // empty' 2>/dev/null || true)"
TOOL_CMD="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
TOOL_FILE_PATH="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"

# For PostToolUse, filter by tool:
#   - Bash: only act when the command is a `git add` variant. Other git commands pass through.
#   - Edit|Write|MultiEdit: always run the stack audit (file just created/edited may be
#     trackable because .gitignore lacks a pattern). No command filter.
# Unknown tool names → no-op.
if [ "$EVENT_TYPE" = "PostToolUse" ]; then
  case "$TOOL_NAME" in
    Bash)
      case "$TOOL_CMD" in
        *"git add"*) : ;;  # proceed
        *) exit 0 ;;
      esac
      ;;
    Edit|Write|MultiEdit)
      : # proceed with stack audit below
      ;;
    *)
      exit 0
      ;;
  esac
fi

# --- Helpers ---------------------------------------------------------------
pattern_present_in_gitignore() {
  # Returns 0 if pattern (literal) appears as a non-comment line in .gitignore.
  local pattern="$1"
  [ -f "$GITIGNORE" ] || return 1
  # Strip leading/trailing whitespace, ignore empty and comment lines
  awk -v p="$pattern" '
    /^[[:space:]]*#/ {next}
    /^[[:space:]]*$/ {next}
    {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
      if ($0 == p) { found=1; exit }
    }
    END { exit !found }
  ' "$GITIGNORE"
}

marker_exists() {
  # Returns 0 if the stack marker file or directory exists relative to repo root
  local marker="$1"
  [ -e "$REPO_ROOT/$marker" ]
}

# --- Main loop -------------------------------------------------------------
# For each rule: if any stack_marker is present AND no required_pattern matches
# (under match_any semantics), emit a warning.
WARNINGS=""
RULE_COUNT="$(jq -r '.rules | length' "$DATA_FILE")"
i=0
while [ "$i" -lt "$RULE_COUNT" ]; do
  RULE_ID="$(jq -r ".rules[$i].id" "$DATA_FILE")"
  RULE_DESC="$(jq -r ".rules[$i].description" "$DATA_FILE")"
  RULE_RATIONALE="$(jq -r ".rules[$i].rationale // \"\"" "$DATA_FILE")"
  MATCH_ANY="$(jq -r ".rules[$i].match_any // true" "$DATA_FILE")"

  # Any stack marker present?
  MARKER_HIT=0
  MARKERS="$(jq -r ".rules[$i].stack_markers[]?" "$DATA_FILE")"
  while IFS= read -r marker; do
    [ -z "$marker" ] && continue
    if marker_exists "$marker"; then
      MARKER_HIT=1
      break
    fi
  done <<EOF
$MARKERS
EOF

  if [ "$MARKER_HIT" -eq 0 ]; then
    i=$((i + 1))
    continue
  fi

  # Any required_pattern present in .gitignore?
  PATTERN_HIT=0
  PATTERNS="$(jq -r ".rules[$i].required_patterns[]?" "$DATA_FILE")"
  while IFS= read -r pattern; do
    [ -z "$pattern" ] && continue
    if pattern_present_in_gitignore "$pattern"; then
      PATTERN_HIT=1
      break
    fi
  done <<EOF
$PATTERNS
EOF

  # match_any semantics: if any required pattern matches, rule is satisfied
  if [ "$MATCH_ANY" = "true" ] && [ "$PATTERN_HIT" -eq 1 ]; then
    i=$((i + 1))
    continue
  fi

  if [ "$PATTERN_HIT" -eq 0 ]; then
    FIRST_PATTERN="$(printf '%s' "$PATTERNS" | head -n1)"
    WARNINGS="${WARNINGS}  - [${RULE_ID}] ${RULE_DESC} — suggested pattern: '${FIRST_PATTERN}'"$'\n'
    [ -n "$RULE_RATIONALE" ] && WARNINGS="${WARNINGS}    rationale: ${RULE_RATIONALE}"$'\n'
  fi

  i=$((i + 1))
done

# --- Output ---------------------------------------------------------------
if [ -n "$WARNINGS" ]; then
  if [ "$EVENT_TYPE" = "PostToolUse" ] && [ "$TOOL_NAME" = "Bash" ]; then
    printf 'gitignore-guard: warning — `git add` detected while .gitignore lacks stack-recommended patterns.\n' >&2
  elif [ "$EVENT_TYPE" = "PostToolUse" ]; then
    if [ -n "$TOOL_FILE_PATH" ]; then
      printf 'gitignore-guard: warning — file %s was created/edited while .gitignore lacks stack-recommended patterns.\n' "$TOOL_FILE_PATH" >&2
    else
      printf 'gitignore-guard: warning — file edit detected while .gitignore lacks stack-recommended patterns.\n' >&2
    fi
  else
    printf 'gitignore-guard: warning — project stack markers detected but .gitignore missing recommended patterns.\n' >&2
  fi
  printf '%s' "$WARNINGS" >&2
  printf 'Hook is informational only. Review .claude/hooks/data/gitignore-stack-minimums.json for full rules.\n' >&2
fi

exit 0
