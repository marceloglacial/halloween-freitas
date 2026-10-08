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
