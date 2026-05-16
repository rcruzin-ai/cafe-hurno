#!/usr/bin/env bash
# PreToolUse Bash guard for cafe-hurno.
# Blocks:
#   1. git push when the active gh account isn't rcruzin-ai
#   2. git push to main / master directly
#   3. gh pr create with --base main / --base master
#
# Exits 2 to block the tool call; emits the reason on stderr.

set -uo pipefail

cmd=$(printf '%s' "${CLAUDE_TOOL_INPUT:-}" | jq -r '.command // empty' 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Normalize whitespace for matching
norm=$(printf '%s' "$cmd" | tr '\n' ' ')

is_git_push=false
is_pr_create=false
case "$norm" in
  *"git push"*|*"git "*" push"*) is_git_push=true ;;
esac
case "$norm" in
  *"gh pr create"*) is_pr_create=true ;;
esac

if ! $is_git_push && ! $is_pr_create; then
  exit 0
fi

# --- Account guard (push only) ---
if $is_git_push; then
  active=$(gh auth status 2>/dev/null \
    | awk '/Active account: true/{print prev} {prev=$0}' \
    | grep -oE 'account [^ ]+' | awk '{print $2}')
  if [ "$active" != "rcruzin-ai" ]; then
    echo "[guard] Blocked: git push requires gh active account = rcruzin-ai (currently: ${active:-none})." >&2
    echo "        Run: gh auth switch --user rcruzin-ai" >&2
    exit 2
  fi
fi

# --- Push-to-main guard ---
if $is_git_push; then
  # Match `git push <remote> main` or `git push <remote> master` or `git push <remote> HEAD:main` etc.
  if echo "$norm" | grep -qE '(^|[[:space:]])git[[:space:]]+push[[:space:]]+[^[:space:]]+[[:space:]]+(([^[:space:]]+:)?(main|master))([[:space:]]|$)'; then
    echo "[guard] Blocked: direct push to main/master. Only humans push the dev->main PR." >&2
    echo "        Push to dev or a chore/fix/feat branch instead." >&2
    exit 2
  fi
  # Also catch `git push` when the current branch is main/master (push without a refspec)
  if echo "$norm" | grep -qE '(^|[[:space:]])git[[:space:]]+push([[:space:]]+[^[:space:]]+)?[[:space:]]*$'; then
    current_branch=$(git -C "$(pwd)" symbolic-ref --short HEAD 2>/dev/null)
    if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
      echo "[guard] Blocked: refusing to push from main/master (current branch is $current_branch)." >&2
      echo "        Switch to dev or a chore/fix/feat branch first." >&2
      exit 2
    fi
  fi
fi

# --- PR-to-main guard ---
if $is_pr_create; then
  # Default base on this repo is main, so:
  #   - allow only if --base dev is explicit
  #   - block if --base main/master is explicit, or if --base is absent
  if echo "$norm" | grep -qE '\-\-base[[:space:]]+(main|master)([[:space:]]|$)'; then
    echo "[guard] Blocked: gh pr create --base main/master. Only humans open dev->main PRs." >&2
    exit 2
  fi
  if ! echo "$norm" | grep -qE '\-\-base[[:space:]]+'; then
    echo "[guard] Blocked: gh pr create without --base. Default base on this repo is main." >&2
    echo "        Add --base dev to target the working branch." >&2
    exit 2
  fi
fi

exit 0
