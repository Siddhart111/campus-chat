#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "ERROR: Not a git repository. Run this script from the repo root."
  exit 1
fi

MESSAGE="$1"
if [ -z "$MESSAGE" ]; then
  MESSAGE="Update from workspace"
fi

git add -A

git diff --cached --quiet || git commit -m "$MESSAGE"

git push origin main

echo "Pushed to origin/main with message: $MESSAGE"
