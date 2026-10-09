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
3. Load only the skill entrypoints needed for this issue. Use optional
   subagents only for bounded independent work; continue in the primary session
   if delegation is unavailable.
4. Implement only the issue's scope. Match validation to the changed behavior
   and repository instructions. Update documentation only when a documented
   contract or contributor rule changes.
5. Report the issue, selection rationale when applicable, files changed,
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
