# AI harness validation

This record captures a documentation-only validation of the issue workflow
and project skill routing for GitHub issue #47 (AI-06). It was performed on
2026-10-09.

## Issue selection and isolation

- #47 was the earliest ready implementation issue: its AI-03, AI-04, and AI-05
  dependencies (#44, #45, and #46) were closed. The next AI foundation issue,
  #48, depends on #47. The parent epic was treated as context, not as an
  implementation ticket.
- Work began from clean `main` at `62a1df4` in the dedicated worktree
  `/Users/glacial/Dev/halloween-freitas-issue-47` on
  `issue-47-ai-06-validate-end-to-end-ai-harness-behavior`.
- The implementation is documentation-only. It does not change application
  code, tests, homepage design, or deployment configuration.

## Routing smoke test

Ran an ephemeral, read-only Codex CLI prompt with project agents disabled to
exercise the primary-session fallback. It returned the expected project skill
for each sample and cited repository evidence:

| Sample request     | Routed skill      | Evidence returned                                              |
| ------------------ | ----------------- | -------------------------------------------------------------- |
| Homepage design    | `frontend-design` | `design.md` homepage layout guidance                           |
| Malformed API JSON | `backend-data`    | `lib/http.ts` parsing behavior and `lib/http.test.ts` coverage |
| RSVP cutoff        | `event-lifecycle` | `docs/lifecycle.md` registration cutoff contract               |

The process completed successfully with agents disabled and without changing
the worktree. This exercises skill routing and fallback behavior. It does not
test edits to those sample features, their full acceptance criteria, or live
browser flows. Agent delegation remains optional; an unavailable agent must
not block primary-session work.

## Handoff and validation

The worktree was clean before documentation edits, based on the same commit as
`main`, with unrelated issue work preserved in separate worktrees. No pending
changes were inherited. The required handoff is an uncommitted branch for
review; no commit, push, merge, ticket closure, or deploy is performed by the
harness automatically.

Run `pnpm check:docs` for the formatting and local-link checks required for
documentation-only changes. Application tests, lint, build, and runtime checks
are outside this documentation-only change. The smoke test is a routing check,
not a substitute for feature QA or security and concurrency validation when
those behaviors change.
