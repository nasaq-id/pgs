#!/usr/bin/env bash
set -euo pipefail

PROJECT=pgs
ENV_FILE=.env.local

vercel link --yes --project "$PROJECT" >/dev/null

if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r k v; do
    [ -z "$k" ] && continue
    case "$k" in \#*) continue ;; esac
    printf '%s\n' "$v" | vercel env add "$k" production --force >/dev/null 2>&1 || true
  done < <(grep -v '^#' "$ENV_FILE" | grep '=')
  echo "env vars synced"
fi

vercel deploy --prod --yes
