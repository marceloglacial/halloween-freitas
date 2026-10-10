---
name: event-lifecycle
description: Change annual event editions, schedules, active-edition selection, RSVP availability, contestant-entry windows, or enrollment cutoffs. Use for event and registration transitions; ballot and results rules belong to contest-voting.
---

# Event lifecycle

Before changing behavior, read the approved [product](../../../docs/product.md),
[lifecycle](../../../docs/lifecycle.md), [architecture](../../../docs/architecture.md),
and [data model](../../../docs/data-model.md). They define target behavior even
when legacy code differs. Follow [repository instructions](../../../AGENTS.md).

## Procedure

1. Trace the transition from its server-side mutation and shared domain
   predicate through admin/guest authorization and UI consumers.
2. Keep editions independent by `eventId`; use the edition's IANA timezone and
   store schedule values as instants. Reject malformed, nonexistent, or
   ambiguous local times.
3. Preserve independent controls: RSVP availability derives from
   `registrationStartsAt`, active-edition status, and the first-voting cutoff;
   contestant entry is administrator-controlled. The first voting opening
   permanently ends new RSVP and contestant membership changes.
4. Make competing RSVP, contestant, and voting-opening operations serialize at
   that cutoff. Closing or reopening later lifecycle states never removes it.
   Do not apply the cutoff to party-photo uploads by guests who already have a
   valid RSVP for the edition; those uploads remain available after the event
   starts, including after voting opens.
5. Update the authoritative lifecycle docs when the approved transition rules
   change; do not redefine a product rule to match legacy code.

## Output checks

- Use fixed or injected time and test before, at, and after changed schedule
  boundaries, including timezone and daylight-saving cases when applicable.
- Cover invalid input, authorization, concurrent transitions, and cross-event
  access for affected paths.
- Report the transition changed, preserved invariants, tests, and any
  documentation or deployment impact.

For ballot, runoff, tally, or results-publication behavior, also read
[contest-voting](../contest-voting/SKILL.md).
