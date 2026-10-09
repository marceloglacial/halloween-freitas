# AI implementation workflow

This guide applies the repository's [agent instructions](../AGENTS.md) to the
clean rebuild. The approved product and domain contracts live in
[product](product.md), [lifecycle](lifecycle.md), [architecture](architecture.md),
[data model](data-model.md), [testing](testing.md), and the preserved
[design reference](../design.md).

## Authority and source of truth

Follow higher-priority system, developer, and user instructions first. Follow
`AGENTS.md` for repository workflow and safety. Treat the product and domain
documents as the target behavior; existing code may be legacy evidence and can
differ until its rebuild issue is complete. Follow the relevant installed skill
for the work. When documents conflict, surface the conflict and follow the
approved issue contract or ask for product clarification when it is unresolved.

## Skill activation

Load a skill only when its trigger matches the task. Start with the
entrypoint(s) in this table; follow their pointers only for relevant branches.
Do not eagerly read all skills or every domain document.

| Request                                                                                             | Skill                           |
| --------------------------------------------------------------------------------------------------- | ------------------------------- |
| Choose the next ready issue or implement a GitHub issue                                             | `issue-workflow`                |
| Change pages, components, hooks, forms, responsive states, or visual alignment                      | `frontend-design`               |
| Change API handlers, server queries, validation, identity, or response contracts                    | `backend-data`                  |
| Change editions, schedules, RSVP availability, contestant-entry windows, or enrollment cutoff       | `event-lifecycle`               |
| Change contest eligibility, ballots, rounds, runoff, tally, or results publication                  | `contest-voting`                |
| Verify changes, choose tests, or report release QA                                                  | `qa-validation`                 |
| Change an approved product, architecture, lifecycle, data, testing, design, or contributor contract | `documentation-sync`            |
| Design indexes or perform an explicitly authorized live database operation                          | `halloween-database-operations` |
| Verify Next.js runtime behavior                                                                     | `next-dev-loop`                 |

For example, use `issue-workflow` for “implement the next ready issue” or
“implement issue #54 after checking its dependencies.” Use `frontend-design` for
“make the RSVP form match design.md on mobile,” `backend-data` for “validate
the RSVP endpoint's malformed input and response contract,” `event-lifecycle`
for “test the registration cutoff at first voting open,” `contest-voting` for
“prevent duplicate ballots under concurrent submissions,” `qa-validation` for
“verify this change and report remaining coverage gaps,” and
`documentation-sync` for “update the lifecycle contract after this approved
rule change.”

Combine skills only when the task crosses their actual scopes. For example,
voting API work may need `contest-voting` and `backend-data`; use
`documentation-sync` only if the approved contract changes. Keep the
`design.md` reference binding for visual work and preserve the established
homepage layout unless a redesign is requested.

Delegate only bounded work; the primary agent owns integration and every
delegate inherits repository, branch, data-safety, and review constraints.

## Optional Codex reviewers

Codex can load the project-scoped reviewers from `.codex/agents/` when the
repository is trusted and the installed CLI supports custom agents. They are
read-only and optional; the primary agent chooses whether parallel review is
useful and remains responsible for checking delegated claims against the
repository and approved contracts.

| Role                   | Bounded review                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `product_architecture` | Product, lifecycle, architecture, data-model, testing, and design contract consistency  |
| `frontend_design`      | UI implementation, design alignment, accessibility, responsive states, and interactions |
| `backend_data`         | API contracts, server data access, ownership, event scoping, and public-data privacy    |
| `qa_security`          | Test coverage, authorization, privacy, isolation, race conditions, and abuse cases      |

Give a reviewer one concrete question, the relevant paths, and any applicable
skill or contract. Request evidence with file and line references and a clear
distinction between confirmed findings and coverage gaps. Reviewers must not
edit files, access or mutate live data, commit, publish, merge, or deploy. The
primary agent integrates changes and runs required validation. Do not delegate
secrets or ask a read-only role to exercise a live workflow.

To smoke-check local setup without running a model task, run
`codex --version` and `codex debug prompt-input` from the trusted repository;
the installed CLI must parse project configuration successfully. For a
delegation smoke test, ask Codex to delegate one harmless, read-only question
to a named role and confirm it returns evidence without modifying files. If
project trust, CLI support, or delegation is unavailable, do the review in the
primary session and continue; delegation is never a prerequisite for a task.

## Issue execution

1. Read the issue and its dependencies. Work on one implementation issue at a
   time; treat epics as context.
2. Inspect the default branch, current branch, worktrees, and working tree. Use
   a clean default-branch base and a dedicated `issue-<number>-<slug>` branch.
   If the current worktree is dirty, preserve it and create a separate worktree
   from the clean default branch when available; otherwise stop and report the
   blocker. Never stash, reset, clean, overwrite, or start on top of pending
   changes from another issue.
3. Trace the existing route, domain helper, data shape, and consumer before
   implementation. Rebuild from scratch where legacy behavior conflicts with
   the approved contract.
4. Implement server-enforced authorization, event isolation, lifecycle
   transitions, and public data shaping. Update contracts, docs, and focused
   regression tests together.
5. Validate by scope: docs-only work uses formatting and link checks; code work
   runs the tests, lint, build, and relevant runtime or responsive checks.
6. Report issue scope, changed files, acceptance criteria, checks/results, and
   risks. Leave work ready for human review.

## Git, database, and release boundaries

The review handoff is implementation → relevant checks → report → stop with
uncommitted changes → user review or revision request. Commit only after the
user explicitly authorizes the commit; push, PR creation, merge, and deploy each
require separate explicit authorization. Review feedback authorizes corrections
to the current issue only. Never begin another issue by inheriting pending
changes; integrate the current issue or keep it safely isolated in another
worktree first.

GitHub CI runs validation only with read-only repository permissions. It never
commits, pushes, merges, or deploys. Documentation-only changes run Markdown
formatting and local-link checks; other changes run lint, tests, and build.
Never reset a database as part of normal annual operation. The clean rebuild
has no historical migration requirement; destructive reset still requires
explicit approval and a confirmed target. Never perform live index or migration
work without its documented prerequisites and explicit authorization.
