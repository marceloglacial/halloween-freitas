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

At the time of this 2026-10-09 validation, the worktree was clean before
documentation edits, based on the same commit as `main`, with unrelated issue
work preserved in separate worktrees. No pending changes were inherited. That
historical handoff left an uncommitted branch for review; the approval-driven
local finalization policy is documented in the later section below.

Run `pnpm check:docs` for the formatting and local-link checks required for
documentation-only changes. Application tests, lint, build, and runtime checks
are outside this documentation-only change. The smoke test is a routing check,
not a substitute for feature QA or security and concurrency validation when
those behaviors change.

## Live epic selection check

Refreshed all GitHub issues and epic bodies on 2026-10-10 and compared candidate
dependencies with the current `main` implementation. E00 (#36) and E01 (#37)
are closed. E02 (#38) is also closed, but its body says it is ready for
completion review and leaves the definition-of-done items unchecked. The
project status supplied for this review also says E02 needs final validation.
Treat that as a completion inconsistency to surface: the closed state is not
validation evidence, and the epic must not be re-closed or declared complete
without the required review and explicit user approval.

E03 (#39) is the earliest open epic. Its body lists #61 and #68 as its open
implementation children and says they depend on CON-02 and CON-06. Those keys
resolve to #59 and #69, both closed. Their portal and photo-upload behavior is
integrated. The current contestant creation API and mutation helper expose
individual-entry creation (`app/api/contestant-entries/route.ts` and
`lib/contestant-entry-mutations.ts`); no junior-entry create flow is present.
The closed duplicate #67 is titled CON-04 too, but does not satisfy #61's
acceptance criteria by status alone. #68's group create flow is also absent.

The selector therefore recommends **#61 — CON-04 Junior contest
registration** next: it is the first open E03 child, its declared technical
dependencies are integrated, and repository evidence shows its core create
flow is missing. #68 is also technically ready but follows #61 in the epic's
stated child order. E02's final-validation discrepancy remains visible as a
milestone gate; it does not create a technical dependency edge that blocks
these independent entry flows. The review made no issue-status, branch, or
worktree changes.

This selection check validates the documented refresh → group → resolve →
inspect implementation → recommend sequence against live issue state and code.
It does not implement #61 or #68, close an epic, or replace their acceptance
tests and final E03 integration QA.

The read-only Codex prompt smoke test routed to `issue-workflow` and returned
#61 provisionally, while correctly flagging that its isolated CLI could not
refresh GitHub: its configured token was invalid and its sandbox could not
connect to `api.github.com`. The primary session then independently refreshed
the public issues using unauthenticated `gh issue list --state all` and read
the current bodies for #38, #39, #61, and #68. Keep authentication status
separate from public read access, and never treat the isolated prompt's
snapshot-based result as live confirmation.

## Approval-driven local finalization check

The workflow contract is: implementation handoff stays uncommitted; approval
of exactly the current reviewed issue change set authorizes local commit,
non-fast-forward merge to local `main`, post-merge validation, and safe removal
of that issue worktree and local branch. Push, PR creation/merge, issue
closure, epic closure, and deployment remain separate and are never implied.

| Scenario                                             | Required behavior                                            | Validation method                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| No approval yet                                      | No commit, merge, or cleanup                                 | Isolated simulation: main ref unchanged and issue worktree remains uncommitted |
| Current implementation approved                      | Run local commit and local merge automatically               | Workflow rule review                                                           |
| Merge and validation pass                            | Remove only the clean issue worktree and merged local branch | Isolated Git simulation                                                        |
| Approval / “continue development”                    | No push                                                      | Workflow rule review; no remote in fixture                                     |
| Explicit `push main to origin`                       | Authorize only that branch/remote push                       | Policy review only; no push executed                                           |
| Merge conflict                                       | Stop and retain issue branch/worktree                        | Isolated `merge-tree` conflict simulation                                      |
| Another worktree has uncommitted changes             | Preserve it unchanged                                        | Isolated Git simulation                                                        |
| Post-merge validation fails                          | Stop cleanup; preserve issue worktree/branch for recovery    | Isolated Git simulation                                                        |
| GitHub issue closed, commit absent from local `main` | Flag the mismatch; do not count it as integrated             | Isolated ancestry check                                                        |
| Epic children closed, final validation missing       | Report gate; do not close the epic                           | Workflow rule review                                                           |
| Earlier push authorization exists                    | Do not reuse it                                              | Workflow rule review                                                           |

An isolated temporary Git repository exercised local commit → `--no-ff`
merge → clean worktree removal → merged local branch deletion, preservation of
an unrelated dirty worktree, conflict detection without merge, retaining the
issue worktree/branch after simulated post-merge validation failure, and an
issue commit that is not an ancestor of local `main`. The fixture had no remote
and was deleted after the run. No command touched this project repository's
Git history, no external push was performed, and no worktree here was removed.
The policy-only rows were checked against the authoritative workflow text;
they are not automated authorization tests.

The Codex CLI prompt simulation can run in a network-restricted sandbox. If
that isolated process cannot reach GitHub, it must report the limitation;
the primary session can still refresh public issue state anonymously where
available. The local-finalization simulation does not validate Codex's
interpretation for every phrasing of an approval, so ambiguous approval still
requires clarification.
