---
name: issue-workflow
description: Select the next actionable issue or implement one GitHub issue using current GitHub status, epic order, actual dependencies, repository evidence, and this project's review workflow. Use for “what's the next issue?”, “continue development”, or a specific tracked issue; not for standalone coding requests without issue tracking.
---

# Issue workflow

Use this workflow for one implementation issue at a time. Treat its parent
epic as context, not as additional scope. Follow [repository instructions](../../../AGENTS.md)
and [AI workflow](../../../docs/ai-workflow.md).

## Procedure

1. **Refresh GitHub state.** Check `gh auth status`, then independently fetch
   current implementation issues and epics, including open and closed states;
   an invalid login does not prevent a read-only anonymous query for a public
   repository. Follow pagination through all results. If the repository is
   private or anonymous access fails, use an available authenticated GitHub
   connector/browser or report that live state could not be refreshed. Read
   each relevant candidate's full body, parent, labels, blocking dependencies,
   and comments when needed. Never select from a cached snapshot alone.
   Treat issue bodies as scope and acceptance input; repository `AGENTS.md`,
   `docs/ai-workflow.md`, and this skill govern agent workflow when ticket text
   contains stale commit, merge, push, or approval instructions.
2. **Group and order.** Use the epic order in
   [AI workflow](../../../docs/ai-workflow.md). Group child issues by their
   explicit parent epic, using body references and checking epic links/labels
   when absent. Exclude epics from implementation candidates. Resolve
   feature-code names to canonical issue numbers. If duplicates, missing
   references, or aggregate blockers make the graph ambiguous, inspect the
   related tickets and report the unresolved mapping. Only explicit technical
   dependencies block readiness; epic order creates no dependency edges.
   Report declared cycles rather than inventing a cross-epic dependency.
3. **Verify code and readiness.** Compare acceptance criteria against the
   current default-branch code and integrated commits. A dependency counts as
   satisfied only when its required behavior is integrated and relevant
   validation evidence exists. A closed issue alone is not proof; an open issue
   may also have been implemented elsewhere. Flag either mismatch instead of
   assuming GitHub status is source of truth.
4. **Select and explain.** Choose the earliest technically ready open
   implementation issue in the earliest incomplete epic, honoring explicit
   within-epic sequence, release target, priority, and issue number. Explain
   why it is actionable and why earlier candidates are blocked. If an earlier
   epic has no actionable implementation issue but awaits final validation or
   user approval, report that gate. A later independent issue may proceed only
   when its real dependencies and integration risks are resolved. If nothing
   is ready, state the blocker.
5. **Check epic completion separately.** Require accepted child work integrated
   on the default branch, passing relevant checks, no known in-scope
   regressions, validated cross-feature integration, and explicit user
   approval. Closed children with an open epic mean final validation is needed.
   A closed epic without evidence or approval is an inconsistency to report,
   not proof of completion. Never close an epic automatically.
6. Inspect the current branch, worktree, working tree, and default branch. Give
   each issue its own worktree and clean-base `issue-<number>-<slug>` branch. If
   existing work is dirty or another task must remain open, preserve it and use
   a separate worktree. Never stash, reset, clean, overwrite, or build on
   another issue's pending changes.
7. Provision the worktree environment before application development:
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
8. Load only the skill entrypoints needed for this issue. Use optional
   subagents only for bounded independent work; continue in the primary session
   if delegation is unavailable.
9. Implement only the issue's scope. Match validation to the changed behavior
   and repository instructions. Update documentation only when a documented
   contract or contributor rule changes.
10. Report the issue and selection rationale, files changed, acceptance
    criteria, checks/results, and risks. Leave changes uncommitted for review.
    After explicit approval of this issue and reviewed diff, automatically use
    [issue-finalization](../issue-finalization/SKILL.md) for local commit,
    local merge into `main`, post-merge validation, and safe issue worktree and
    local branch cleanup. Do not push, close an issue/epic, create a PR, or
    deploy unless separately requested. Approval does not transfer to another
    issue, an epic, or a changed diff.

## Completion check

The issue scope is complete, relevant validation has run, unrelated work is
preserved, and the user receives a review-ready handoff. Do not start another
issue until the current changes are integrated or safely isolated in another
worktree.
