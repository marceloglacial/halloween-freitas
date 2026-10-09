---
name: issue-finalization
description: Finalize one GitHub issue only after explicit user approval of its reviewed change set; commit, integrate by direct merge or required PR, clean its worktree/branch, and close the ticket.
---

# Issue finalization

Run this skill only after explicit user approval identifies the GitHub issue
and the reviewed change set. A request to implement, revise, review, or report
does not authorize finalization. Approval is for one issue and one change set;
any post-review edits require a new handoff and approval. The primary agent
performs finalization; read-only reviewer agents never do. Never deploy.

Follow [repository instructions](../../../AGENTS.md) and the [AI workflow
guide](../../../docs/ai-workflow.md). For a protected branch, use the
repository's PR workflow, `.github/PULL_REQUEST_TEMPLATE.md`, and the installed
PR-writing skill when available.

## Procedure

1. **Bind approval to the work.** Identify the issue number, issue branch,
   issue worktree, approval message, and review summary. Confirm the worktree is
   on the expected `issue-<number>-<slug>` branch and record its verified name
   as `issue_branch`. Inspect normal and ignored
   `git status`, staged and unstaged diffs, untracked files, recent commits,
   and the issue state. Compare every changed path and change to the reviewed
   scope. Stop for a new review if anything changed after approval or is
   outside that scope. If the issue is already closed, verify its approved
   change is integrated; otherwise stop and report the inconsistent state.
2. **Commit only approved files.** Stage explicit reviewed paths; do not use
   broad staging. Create a Conventional Commit that references the issue, for
   example `fix(issue-54): enforce the RSVP cutoff`, with `Refs #54` in its
   body. If a correct issue-referenced commit already exists, verify it instead
   of duplicating it. Preserve unrelated changes.
3. **Check integration policy and current `main`.** Identify the repository's
   default branch and fetch it from `origin`. Inspect branch protection, rules,
   required checks, and required reviews. If protection requires a pull
   request, or the requirements cannot be determined, use the PR path and do
   not merge directly. Use the installed PR-writing skill when available and
   `.github/PULL_REQUEST_TEMPLATE.md`. Check applicable branch-protection and
   repository/organization ruleset settings with GitHub; missing permission or
   an inconclusive response means the policy is unknown, not unprotected.
   Before pushing, confirm `origin/main` is an ancestor of the issue branch and
   `git diff origin/main..."$issue_branch"` contains only the approved change
   set; stop if local-only commits would enter the PR. Push only the approved
   issue branch when needed for that PR; never force push. If direct merge is
   allowed, locate the existing clean default-branch worktree. Do not switch,
   clean, stash, or modify an unrelated worktree. If the default-branch
   worktree is missing or dirty, stop and report it.
4. **Check for integration problems.** Compare local `main` with fetched
   `origin/main`. Fast-forward a behind, clean `main` only. If local and remote
   histories diverge, stop without resetting or rebasing. Preflight the issue
   branch merge with a non-mutating
   `git merge-tree --write-tree main "$issue_branch"` check and inspect the
   complete delta. If conflicts or
   unrelated changes appear, stop with the issue worktree intact. If bringing
   the branch up to date changes reviewed behavior, report the changed scope and
   obtain fresh approval. Rerun the relevant validation when integration
   changes code.
5. **Merge without rewriting history.** When direct integration is allowed and
   conflict-free, merge the issue branch into `main` with `--no-ff`. For a
   protected branch, follow the PR's required checks and human reviews and use
   the repository-approved PR merge method. Never bypass protections. If a
   check, review, or merge fails, stop and preserve the issue branch/worktree.
6. **Verify integration.** Confirm `main` contains the approved commit or
   merged PR, inspect the final merge diff, and confirm the default-branch
   worktree is clean. Run relevant validation if the integrated code changed.
   Record the merge commit SHA for recovery.
7. **Remove the completed worktree safely.** Confirm the issue worktree is
   clean and points to the merged branch. Inspect ignored files before removal;
   preserve local secrets and user data. Remove it without force only when
   remaining ignored files are known disposable caches/build output. If Git
   refuses or any file's value is unclear, stop and preserve the worktree.
   If the issue worktree has an `.env.local` symlink, verify it points to the
   main worktree's development-only `.env.local` source. Discover the main
   worktree from the first entry of `git worktree list --porcelain` and resolve
   it to an absolute path, following the provisioning rules in
   [issue-workflow](../issue-workflow/SKILL.md). Normal worktree removal
   removes the issue-side symlink; leave the source file untouched.
   If `.env.local` is a regular file or points elsewhere, stop and preserve
   the worktree for review.
8. **Delete the local issue branch safely.** Use the normal merged-branch
   deletion operation only after confirming its commit is reachable from
   `main`. Never force-delete. Remote branch deletion is optional and skipped
   by default; if the same approval explicitly includes it, confirm that the
   remote branch exists and has been merged before deleting it.
9. **Close and report the issue.** If a merged PR already closed the issue,
   verify its closed state. Otherwise close only the approved issue and include
   the commit/merge SHA and validation results in the close note. Report the
   issue, commit, merge/PR, checks, cleanup, and final repository state.

## Failure handling

Stop at the first failure. Do not retry with force options, reset, discard,
rewrite approved commits, or touch another worktree. Preserve the issue branch
and worktree for recovery. If worktree removal succeeded but a later step fails,
recreate the branch and worktree from the recorded merge commit before stopping
so the approved work remains available locally. Leave the deployment untouched.
