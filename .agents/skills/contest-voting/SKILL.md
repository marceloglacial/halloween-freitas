---
name: contest-voting
description: Change contestant eligibility for ballots, voting rounds, ballot integrity, runoff rules, tallies, or results publication. Use for contest and voting behavior; event schedules and RSVP availability belong to event-lifecycle.
---

# Contest and voting

Read the approved [product](../../../docs/product.md),
[lifecycle](../../../docs/lifecycle.md), [architecture](../../../docs/architecture.md),
[data model](../../../docs/data-model.md), and relevant scenarios in
[`testing.md`](../../../docs/testing.md) before changing behavior. Follow
[repository instructions](../../../AGENTS.md).

## Procedure

1. Trace contestant ownership and eligibility, the frozen candidate set, vote
   round state, voter identity, persistence constraints, result calculation, and
   public publication boundary touched by the change.
2. Derive voter identity from the verified Clerk session and same-edition RSVP.
   Scope candidates, categories, rounds, and ballots to one `eventId`; enforce
   one ballot per eligible RSVP/category/round with a database constraint.
3. Preserve stable contestant and ballot IDs through permitted corrections.
   Reject self-votes for individual entries; retain the documented guardian and
   group-creator voting rules.
4. Preserve the primary-round and single-runoff contract, ties, zero-vote
   categories, and closed-round ballots. Reopening a round never reverses the
   enrollment cutoff.
5. Keep results private until the final round ends and an administrator
   publishes them. Unpublishing or reopening voting must revoke public API,
   rendering, and cache access.

## Output checks

- Test duplicate/concurrent ballots, invalid or ineligible votes, unauthorized
  access, self-vote rules, event isolation, and publication privacy as
  applicable.
- Use fixed or injected dates for lifecycle boundaries. Update target contract
  docs when the approved rules change.
- Run repository-required code checks and report ballot integrity, privacy,
  concurrency, and publication results.
