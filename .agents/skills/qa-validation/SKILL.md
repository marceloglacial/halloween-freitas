---
name: qa-validation
description: Choose and run proportionate validation for Halloween Freitas changes or review a release candidate. Use when asked to verify, QA, or report test coverage; application security changes should also load their domain skill.
---

# QA validation

Use the issue scope and [testing strategy](../../../docs/testing.md) to choose
checks. Follow [repository instructions](../../../AGENTS.md); validation must
not touch production data or perform an unapproved external mutation.

## Procedure

1. Map each changed behavior to observable success and failure scenarios.
   Identify malformed input, authorization, privacy, concurrency, and
   cross-edition isolation cases only where the changed path makes them
   relevant.
   For party-gallery changes, verify that a same-edition RSVP guest can upload
   after the event starts even after voting opens; uploads stay private before
   publication, appear automatically after publication, and removal revokes
   access. Follow the detailed matrix in `docs/testing.md`.
2. For documentation-only changes, check Markdown formatting and local links;
   do not run application race or security suites solely because they exist.
   For harness workflow changes, validate the approval/operation matrix in
   `docs/ai-harness-validation.md`. If exercising Git behavior, use only a
   temporary isolated repository; never push to a real remote or mutate a
   project worktree as part of the simulation.
3. For application-code changes, add or update focused tests for relevant
   scenarios, then run the repository-required `pnpm test`, `pnpm lint`, and
   `pnpm build`. Use isolated fixtures rather than a live database.
4. For UI changes, follow the relevant runtime-verification skill and inspect
   affected responsive, pending, empty, error, denied, and success states.
   For admin dashboard changes, use the lifecycle matrix in
   `docs/testing.md`; verify selected-edition links and ensure contextual
   actions do not advertise a transition rejected by the server.
5. Distinguish a passing check from a coverage gap or an unavailable check. Do
   not claim behavior verified by a build alone.

## Output checks

Report each command and result, scenarios exercised, uncovered risks, and
checks blocked by missing browser, account, or service access. Recommend only
the next validation that addresses a concrete uncovered risk.
