#!/bin/sh
# Copies scripts/git-hooks/* into the repository's shared hooks folder, so every
# worktree of this repo runs them. Re-run after changing a hook.
set -e

root="$(git rev-parse --show-toplevel)"
hooks="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"

mkdir -p "$hooks"
for hook in "$root"/scripts/git-hooks/*; do
  name="$(basename "$hook")"
  cp "$hook" "$hooks/$name"
  chmod +x "$hooks/$name"
  echo "installed $name -> $hooks/$name"
done
