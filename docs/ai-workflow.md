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

## Route work to skills

- UI, responsive layout, forms, and guest/admin interaction: read
  `halloween-frontend`.
- API, persistence, identity resolution, and server responses: read
  `halloween-backend`.
- RSVP, contestant lifecycle, voting, authorization, and publication behavior:
  read `halloween-event-workflows` and the domain documents above.
- Index, database migration, or live database operations: read
  `halloween-database-operations` and `docs/operations.md`.
- Next.js runtime verification: read `next-dev-loop` and reuse an existing
  development server when available.

Read only the relevant versioned Next.js guide and skills for a task. Delegate
only bounded work; the primary agent owns integration and every delegate
inherits repository, branch, data-safety, and review constraints.

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
2. Inspect branch, working tree, and worktrees. Start from the clean default
   branch on `issue-<number>-<slug>`. Preserve unrelated work; do not stash,
   reset, clean, overwrite, or combine it.
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

Do not commit, push, merge, or deploy automatically. Each such action requires a
separate explicit user request. A request for review authorizes corrections to
the current issue only; it does not authorize beginning another issue. Never
reset a database as part of normal annual operation. The clean rebuild has no
historical migration requirement; destructive reset still requires explicit
approval and a confirmed target. Never perform live index or migration work
without its documented prerequisites and explicit authorization.
