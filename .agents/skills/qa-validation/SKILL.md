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
2. For documentation-only changes, check Markdown formatting and local links;
   do not run application race or security suites solely because they exist.
3. For application-code changes, add or update focused tests for relevant
   scenarios, then run the repository-required `pnpm test`, `pnpm lint`, and
   `pnpm build`. Use isolated fixtures rather than a live database.
4. For UI changes, follow the relevant runtime-verification skill and inspect
   affected responsive, pending, empty, error, denied, and success states.
5. Distinguish a passing check from a coverage gap or an unavailable check. Do
   not claim behavior verified by a build alone.

## Output checks

Report each command and result, scenarios exercised, uncovered risks, and
checks blocked by missing browser, account, or service access. Recommend only
the next validation that addresses a concrete uncovered risk.
