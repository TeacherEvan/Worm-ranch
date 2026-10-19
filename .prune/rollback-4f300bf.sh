#!/usr/bin/env bash
# =============================================================================
# Surgical Pruning Rollback Script — Worm Ranch
# =============================================================================
# Reverts commit 4f300bf "chore: prune unused exports and dead constants"
# Restores the 7 removed symbols + the BaseDefenseBankBar default export.
#
# Usage:  bash .prune/rollback-4f300bf.sh
#         (run from the repo root)
#
# Safety: this script is idempotent and non-destructive to uncommitted work.
#         It restores the pre-prune versions of exactly 5 files from commit
#         9cf8982 (the parent of the prune commit).
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PRUNE_COMMIT="4f300bf498cf7fb801d0a39ba23b12b8174f900a"
PARENT_COMMIT="9cf8982"

echo "=== Surgical Pruning Rollback ==="
echo "Target: revert prune commit $PRUNE_COMMIT"
echo "Repo:   $REPO_ROOT"
echo

# Confirm we are on a clean tree (or at least that the target files match HEAD)
echo "Current HEAD: $(git log -1 --format='%H %s')"
echo

# Verify the prune commit is present in history
if ! git merge-base --is-ancestor "$PRUNE_COMMIT" HEAD 2>/dev/null; then
  echo "ERROR: prune commit $PRUNE_COMMIT is not in the current branch history."
  echo "       Nothing to roll back."
  exit 1
fi

# Files affected by the prune commit (restore to their pre-prune versions)
FILES=(
  src/components/BaseDefenseBankBar.tsx
  src/components/GameStageOverlay.tsx
  src/components/gameStagePhasePresentation.ts
  src/components/gameStagePresentation.ts
  src/game/baseDefenseConstants.ts
)

echo "Restoring the following files to their pre-prune (9cf8982) versions:"
for f in "${FILES[@]}"; do
  echo "  - $f"
done
echo

read -r -p "Proceed with rollback? This will overwrite working-tree changes to the 5 files above. [y/N] " confirm
if [[ "$confirm" != [yY] && "$confirm" != [yY][eE][sS] ]]; then
  echo "Rollback aborted by user."
  exit 0
fi

# Restore each file from the parent commit
for f in "${FILES[@]}"; do
  if git show "$PARENT_COMMIT:$f" >/dev/null 2>&1; then
    git checkout "$PARENT_COMMIT" -- "$f"
    echo "  [restored] $f"
  else
    echo "  [skipped]  $f (not present in $PARENT_COMMIT)"
  fi
done

echo
echo "Rollback complete. Review the restored files, then commit if desired:"
echo "  git add ${FILES[*]}"
echo "  git commit -m 'chore: restore pruned dead-code symbols (rollback of $PRUNE_COMMIT)'"
echo
echo "Alternatively, to revert the entire prune commit at once:"
echo "  git revert $PRUNE_COMMIT"
