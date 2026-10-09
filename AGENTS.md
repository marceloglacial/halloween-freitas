# Agent instructions

These instructions apply throughout the repository. More specific nested
`AGENTS.md` files add local guidance. Follow system and developer instructions,
then the user's request, these repository rules, and the relevant skill. Resolve
conflicts in favor of higher-priority instructions. Treat source code,
configuration, and command output as the source of truth for repository state.

## Orchestration and skill routing

The primary agent owns the task, routes it to the relevant project skill, and
reports the result. Read only skills that apply to the requested work.

| Work                                                                                  | Read before acting                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Selecting or executing one GitHub issue                                               | `.agents/skills/issue-workflow/SKILL.md`                |
| Pages, components, client hooks, responsive UI, or design alignment                   | `.agents/skills/frontend-design/SKILL.md`               |
| API handlers, server queries, request validation, or response contracts               | `.agents/skills/backend-data/SKILL.md`                  |
| Annual editions, schedules, RSVP, contestant-entry windows, or enrollment cutoffs     | `.agents/skills/event-lifecycle/SKILL.md`               |
| Contest eligibility, ballots, voting rounds, runoff, tally, or results publication    | `.agents/skills/contest-voting/SKILL.md`                |
| Choosing/running checks or release QA                                                 | `.agents/skills/qa-validation/SKILL.md`                 |
| Updating product, architecture, lifecycle, data, testing, design, or contributor docs | `.agents/skills/documentation-sync/SKILL.md`            |
| Database indexes or live event migrations                                             | `.agents/skills/halloween-database-operations/SKILL.md` |
| Requested Next.js runtime verification                                                | `.agents/skills/next-dev-loop/SKILL.md`                 |
| Requested Next.js bundle or Cache Components / Partial Prefetching work               | The matching `next-*` skill under `.agents/skills/`     |

Load only the skill entrypoints whose triggers match the task. Do not read every
skill or domain document speculatively; follow a selected skill's pointers when
its procedure reaches that branch.

For event, voting, authorization, or data-ownership changes, read
`docs/product.md`, `docs/lifecycle.md`, `docs/architecture.md`, and
`docs/data-model.md`; these define the rebuild target even when legacy code
differs. For environment, database, or deployment changes, read
`docs/operations.md`. Use `docs/testing.md` for applicable acceptance scenarios
and `design.md` for visual changes; preserve the existing homepage layout unless
the user requests a redesign. Keep the existing Next.js, React, TypeScript,
Tailwind CSS, Clerk, MongoDB, and Cloudinary stack unless the user changes that
requirement.

The primary agent remains accountable for delegated work. Give each subagent a
bounded task and the applicable repository and skill instructions. Subagents
inherit the same branch, data-safety, and review rules; they do not commit,
publish, merge, or deploy work.

Project Codex roles are optional read-only reviewers in `.codex/agents/`:
`product_architecture`, `frontend_design`, `backend_data`, and `qa_security`.
Delegate only when the question benefits from an independent, bounded review;
the primary agent selects the relevant role, evaluates its evidence, and owns
all implementation and final decisions. If Codex does not load project roles
or delegation is unavailable, perform the same focused review directly and
continue without delegation.

## Work and branch safety

- For a GitHub issue, work on exactly that implementation issue; use epics as
  context, not as additional work items.
- Before changing files, inspect the current branch, working tree, and
  worktrees. Start issue work from the default branch on a clean, dedicated
  `issue-<number>-<slug>` branch.
- If the tree contains uncommitted work or the target branch/worktree is already
  in use, preserve it. Do not stash, reset, clean, overwrite, or mix that work;
  stop and ask the user to resolve the conflict or choose an isolated worktree.
- Never commit, push, merge, or deploy automatically. Leave changes uncommitted
  for human review. Review feedback authorizes corrections to the current work
  only; each Git publication or deployment step needs separate explicit
  authorization.
- Do not run destructive database or infrastructure operations without explicit
  user authorization. Read the relevant operations guidance first.
- Start another issue only after the current changes are integrated or safely
  isolated in a different worktree.

## Implementation and validation

Inspect the current implementation and relevant versioned documentation before
changing code. This Next.js version may differ from familiar APIs; consult the
matching guide in `node_modules/next/dist/docs/` before writing Next.js code.
Keep route-specific code near its route, shared behavior in the appropriate
shared module, and data and authorization logic on the server.

Match validation to the change. For code changes, run `pnpm test`, `pnpm lint`,
and `pnpm build`, plus the relevant runtime checks for UI behavior. For
documentation-only changes, check formatting and links. Do not run unrelated
database operations. Use fixed or injected dates for time-sensitive tests.

Keep documentation aligned with behavior: update architecture, operations,
design, or skill guidance when a change alters the contract those documents
describe. Report the scope, changed files, acceptance criteria, checks and
results, and remaining risks; leave all changes ready for human review.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
