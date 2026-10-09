---
name: issue-workflow
description: Select or implement one ready GitHub issue using this repository's dependency, branch, skill-routing, and review-handoff rules. Use when asked to choose the next issue or work from a GitHub issue; do not use for standalone coding requests without issue tracking.
---

# Issue workflow

Use this workflow for one implementation issue at a time. Treat its parent
epic as context, not as additional scope. Follow [repository instructions](../../../AGENTS.md)
and [AI workflow](../../../docs/ai-workflow.md).

## Procedure

1. Read the issue, parent epic, labels, and every listed blocking dependency.
   When asked for the next issue, list open issues, exclude epics, and select
   only an implementation issue whose dependencies are closed. Prefer the
   earliest ready issue in the planned sequence, honoring release and priority
   labels; report why it is ready and why earlier candidates are blocked.
2. Inspect the current branch, worktree, working tree, and default branch. Give
   each issue its own worktree and clean-base `issue-<number>-<slug>` branch. If
   existing work is dirty or another task must remain open, preserve it and use
   a separate worktree. Never stash, reset, clean, overwrite, or build on
   another issue's pending changes.
3. Provision the worktree environment before application development:
   - Run `git worktree list --porcelain` from the repository. Git lists the
     main worktree first. Resolve the first `worktree` path to an absolute
     physical path. Resolve the issue worktree path to an absolute physical
     path after obtaining it with `git rev-parse --show-toplevel`. Do not infer
     either path from a home directory, checkout layout, or project name.
     For example:

     ```sh
     main_worktree_path="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
     main_worktree_path="$(cd -- "$main_worktree_path" && pwd -P)"
     issue_worktree_path="$(git rev-parse --show-toplevel)"
     issue_worktree_path="$(cd -- "$issue_worktree_path" && pwd -P)"
     env_source_path="$main_worktree_path/.env.local"
     env_link_path="$issue_worktree_path/.env.local"
     ```

   - The source is `<main-worktree>/.env.local`; check it with
     `test -f "$env_source_path"`. It must be the development-only environment
     described in [operations](../../../docs/operations.md). Never inspect or
     display its values. If its development-only status is unknown or it may
     contain production credentials, leave it unlinked and report the blocker.
   - Confirm the source is not tracked with
     `git -C "$main_worktree_path" ls-files --error-unmatch -- .env.local`
     and is ignored with
     `git -C "$main_worktree_path" check-ignore --quiet -- .env.local`.
     If the tracked-file check succeeds, or ignore verification fails, stop
     before creating a link and report the configuration problem. Keep both
     checks' output quiet.
   - If the source is a file and the issue worktree has no `.env.local` entry,
     create an absolute symbolic link to the source with `ln -s`. Link creation
     must fail when the target already exists. If an existing target is already
     a symlink to this source and resolves to a file, verify it and leave it in
     place; for any other existing target, stop without changing it. Verify a
     newly created link the same way. Verify quietly with:

     ```sh
     test -L "$env_link_path" \
       && test -f "$env_link_path" \
       && test "$(readlink "$env_link_path")" = "$env_source_path"
     ```

   - If the main worktree has no `.env.local`, continue without a link and
     report the missing environment configuration. Do not create or copy a
     secrets file. Before starting the app or any environment-dependent
     validation, confirm the needed development environment exists.
4. Load only the skill entrypoints needed for this issue. Use optional
   subagents only for bounded independent work; continue in the primary session
   if delegation is unavailable.
5. Implement only the issue's scope. Match validation to the changed behavior
   and repository instructions. Update documentation only when a documented
   contract or contributor rule changes.
6. Report the issue, selection rationale when applicable, files changed,
   acceptance criteria, checks and results, and remaining risks. Leave changes
   uncommitted for review and wait for explicit approval of this issue and the
   reviewed change set. After approval, load
   [issue-finalization](../issue-finalization/SKILL.md) for commit,
   integration/PR, cleanup, and ticket closure. Approval does not transfer to
   another issue or a changed diff. Deployment is never part of finalization.

## Completion check

The issue scope is complete, relevant validation has run, unrelated work is
preserved, and the user receives a review-ready handoff. Do not start another
issue until the current changes are integrated or safely isolated in another
worktree.
