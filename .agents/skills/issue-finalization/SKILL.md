---
name: issue-finalization
description: After explicit approval of the current reviewed issue change set, commit locally, merge into local main, validate, close the exact completed GitHub issue, and safely remove its worktree and local branch. Push, epic closure, PRs, and deployment are separate operations and never inferred.
---

# Issue finalization

Use this workflow after explicit approval of the exact issue implementation
currently presented for review. Approval authorizes the local sequence below;
do not ask again before its commit, local merge, validation, or safe cleanup.
Approval applies to one issue, worktree, branch, and reviewed diff. If the
approval target is ambiguous, the diff changed materially after review, or
repository state differs from the handoff, stop and ask for clarification or a
new review.

This workflow never fetches, pulls, pushes, creates or merges a PR, closes an
epic, or deploys. Approval of this issue's reviewed change set authorizes
closing only the exact linked issue, and only after local merge and validation
succeed. Push requires a separate user request naming the target branch and
remote. Epic closure requires separate explicit approval. The primary agent
owns finalization; read-only reviewer agents never perform these operations.

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
7. **Close the exact issue after integration.** From the clean local `main`
   worktree, after post-merge validation passes, run
   `node scripts/close-merged-issue.mjs <issue-number> <issue-branch> --approved`.
   This explicit approval flag is required. The
   helper verifies that it is running in the registered `main` worktree, both
   `main` and the associated issue worktree are clean, the branch name matches
   the issue number, and the branch is an ancestor of local `main`. It closes
   that issue with reason `completed` and reads it back to verify the result.
   If GitHub is unavailable, the issue is mismatched, or closure cannot be
   verified, stop and preserve the issue worktree and branch. Report the local
   merge and validation as complete but issue closure and cleanup as
   incomplete. Do not close another issue or an epic.
8. **Stop the issue dev server and clean up only after successful closure.**
   Stop the exact process/session handle recorded at startup, using its
   terminal's graceful interrupt, and confirm it exited. Never stop a process
   based only on its port or kill an unrelated listener. If the recorded
   handle is unavailable, identify the process by its working directory and
   command; if ownership is uncertain, preserve the worktree and report the
   blocker. Then confirm the issue worktree is clean, points to the merged
   branch, and has no valuable ignored files. If it has environment symlinks,
   verify they target the canonical checkout's development-only sources;
   ordinary worktree removal removes only those links and generated files.
   Never alter or delete source environment files. Remove the issue worktree
   with `git worktree remove <path>` without force. Run `git worktree prune`
   only when stale metadata remains, then delete the local branch using normal
   merged-branch deletion. Never remove another worktree or a branch that is
   not verified merged. If server shutdown, worktree removal, pruning, or
   branch deletion fails, stop and report exactly which steps succeeded and
   what remains; do not retry destructively.
9. **Report completion.** Provide issue number/title, commit and merge SHAs,
   validation results, verified issue state/reason, worktree and branch
   cleanup, final local status, and whether `main` contains unpushed commits.
   State clearly that no push occurred. Do not begin another issue until this
   issue is integrated locally or safely isolated.

## Separate operations

- **Push:** perform only after an explicit request that identifies the branch
  and remote. Inspect local/remote tracking state and pending commits with
  read-only checks first. If the target is unclear, history diverged, or a
  force push would be needed, stop. Never reuse earlier push authorization.
- **Issue closure:** approval of the exact issue change set authorizes closing
  that linked issue as completed only after its approved commit is integrated
  into local `main` and post-merge validation passes. Use the helper above;
  never infer an issue number from a branch name without verifying the
  association. Do not close another issue or an epic as a side effect.
- **Epic closure:** only after the epic completion criteria in `docs/ai-workflow.md`
  are met and the user explicitly approves closing that named epic. This never
  authorizes a push.
- **PR or deployment:** never create/merge a PR or deploy as part of local
  finalization. Both require separate user direction; deployment also requires
  a confirmed target and its own authorization.

## Failure handling

Stop at the first failed verification, commit, conflict check, merge,
validation, GitHub closure, server shutdown, or cleanup step. Preserve
uncommitted work and all remaining issue branches/worktrees. Do not retry with
force, reset, stash, clean, or rollback. Report the exact local and GitHub
state and the safe recovery point. If the issue closed successfully but later
cleanup fails, leave the remaining merged branch/worktree intact for recovery.
