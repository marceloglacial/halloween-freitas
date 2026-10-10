---
name: issue-finalization
description: After explicit approval of the current reviewed issue change set, automatically commit locally, merge into local main, validate, and safely remove that issue's worktree and local branch. Push, GitHub issue/epic closure, PRs, and deployment are separate operations and never inferred.
---

# Issue finalization

Use this workflow after explicit approval of the exact issue implementation
currently presented for review. Approval authorizes the local sequence below;
do not ask again before its commit, local merge, validation, or safe cleanup.
Approval applies to one issue, worktree, branch, and reviewed diff. If the
approval target is ambiguous, the diff changed materially after review, or
repository state differs from the handoff, stop and ask for clarification or a
new review.

This is a local-only workflow. It never fetches, pulls, pushes, creates or
merges a PR, closes an issue or epic, or deploys. Push requires a separate user
request naming the target branch and remote. Issue and epic closure also
require separate explicit requests. The primary agent owns finalization;
read-only reviewer agents never perform these operations.

Follow [repository instructions](../../../AGENTS.md) and the [AI workflow
guide](../../../docs/ai-workflow.md). Never use force, reset, stash, clean, or
discard another worktree's changes.

## Procedure

1. **Bind approval to the reviewed change.** Confirm the issue number/title,
   approval message, issue worktree, expected
   `issue-<number>-<short-description>` branch, validation results, and reviewed
   paths. Inspect `git status` (including ignored files), staged and unstaged
   diffs, untracked files, recent commits, and worktree list. Compare all
   changes with the handoff. If unexpected or unrelated changes exist, preserve
   them and stop. Do not infer approval from issue labels or status.
2. **Verify the issue worktree.** Confirm it is the expected branch and that
   the reviewed diff is unchanged. Ensure required validation passed during
   development. Identify the local default branch (normally `main`) and its
   worktree using `git worktree list --porcelain`; do not query a remote. Stop
   if the default branch is missing, checked out ambiguously, or has unrelated
   uncommitted changes. Preserve every other worktree as-is.
3. **Commit only the reviewed files.** Stage explicit reviewed paths; never
   use broad staging. Confirm staged diff and absence of secrets, generated
   files, and unrelated changes. Create a Conventional Commit that references
   the issue, for example `feat(issue-61): add junior entry (#61)`. If the
   approved change already has the correct issue-referenced
   commit, verify it rather than duplicating it. Do not amend or rewrite history.
4. **Preflight local integration.** Compare the issue branch with the current
   local `main`, inspect the complete change set, and use a non-mutating merge
   check such as `git merge-tree --write-tree main <issue-branch>` where
   available. Do not fetch, pull, or synchronize with any remote. If local
   `main` advanced in a way that changes reviewed behavior, conflicts, or
   unrelated changes would enter the merge, stop and preserve the issue
   worktree for review/recovery.
5. **Merge into local `main`.** From the existing clean `main` worktree, merge
   the issue branch using `--no-ff` unless repository history shows an
   established alternative. This is a local merge only. If a conflict or
   merge failure occurs, stop; do not resolve ambiguously, reset, or discard.
   Preserve the issue branch and worktree.
6. **Validate the merged result.** Confirm local `main` contains the approved
   commit and inspect the merge diff. Run required validation for the change:
   code changes use `pnpm test`, `pnpm lint`, and `pnpm build`; documentation-
   only changes use `pnpm check:docs`. Check for unexpected files and a clean
   `main` worktree. If validation fails, do not roll back or clean up; preserve
   the issue branch/worktree and report the failure for recovery.
7. **Clean up only after successful validation.** Confirm the issue worktree is
   clean, points to the merged branch, and has no valuable ignored files. If it
   has an `.env.local` symlink, verify that it targets the main worktree's
   development-only source; ordinary worktree removal removes only the
   worktree-side symlink. Never alter or delete the source environment file.
   Remove the issue worktree without force, then delete the local branch using
   normal merged-branch deletion. Never remove another worktree or a branch
   that is not verified merged. If either cleanup step fails, stop and report
   the remaining recovery state; do not retry destructively.
8. **Report local completion.** Provide issue number/title, commit and merge
   SHAs, validation results, worktree and local branch cleanup, final local
   status, and whether `main` contains unpushed commits. State clearly that the
   issue has not been pushed or closed. Do not begin another issue until the
   current work is integrated locally or safely isolated.

## Separate operations

- **Push:** perform only after an explicit request that identifies the branch
  and remote. Inspect local/remote tracking state and pending commits with
  read-only checks first. If the target is unclear, history diverged, or a
  force push would be needed, stop. Never reuse earlier push authorization.
- **Issue closure:** perform only after the user explicitly requests closure
  of the identified issue. Verify that its approved commit is integrated into
  local `main`; a local merge does not update GitHub. Do not close an epic as a
  side effect.
- **Epic closure:** only after the epic completion criteria in `docs/ai-workflow.md`
  are met and the user explicitly approves closing that named epic. This never
  authorizes a push.
- **PR or deployment:** never create/merge a PR or deploy as part of local
  finalization. Both require separate user direction; deployment also requires
  a confirmed target and its own authorization.

## Failure handling

Stop at the first failed verification, commit, conflict check, merge,
validation, or cleanup step. Preserve uncommitted work and all remaining issue
branches/worktrees. Do not retry with force, reset, stash, clean, or rollback.
Report the exact local state and the safe recovery point. If a worktree was
already removed before a later branch-cleanup failure, leave the merged local
branch intact; do not recreate or delete state automatically.
