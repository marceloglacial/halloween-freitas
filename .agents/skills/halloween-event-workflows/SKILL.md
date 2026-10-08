---
name: halloween-event-workflows
description: Change Halloween Freitas event schedules, RSVP and contestant lifecycle, verified guest voting, authorization, results, or gallery publication. Use for domain behavior and related API regressions; ordinary visual styling does not require this skill.
---

# Halloween Event Workflows

Read [product](../../../docs/product.md), [lifecycle](../../../docs/lifecycle.md), [architecture](../../../docs/architecture.md), and [data model](../../../docs/data-model.md) before changing domain behavior. Together they define the rebuild target contract for lifecycle, ownership, and trust boundaries; legacy code may differ until its rebuild issue is complete. Resolve code paths below from the repository root, three directories above this skill. Follow the root contributor instructions, including the installed Next.js guides when writing framework code.

## Trace the affected behavior

Choose the relevant starting points rather than loading every subsystem:

- **Schedules and lifecycle:** `lib/event-schedule.ts` handles local schedule input and timezone conversion; `lib/events.ts` resolves events and exposes lifecycle predicates. Follow mutations into `app/api/admin/events/` and homepage consumers when their behavior is affected.
- **Registration:** `app/api/registrations/route.ts`, `lib/users.ts`, and `lib/http.ts` connect event availability, normalized identity, and request validation.
- **Guest identity and voting:** `lib/auth/guest-registration.ts` and `app/api/guest-access/route.ts` link verified Clerk identities to event registrations; `lib/auth/voting-guest.ts` and `app/api/votes/route.ts` enforce voting access. The retired guest-session endpoint returns 410. Follow candidate eligibility into `lib/voting.ts` and category lookup helpers.
- **Admin access and public results:** `lib/auth/admin.ts` supplies authorization; protected handlers enforce it. Trace result visibility and public serialization through `lib/results.ts` and the relevant API handler.

For each affected operation, identify its event lookup, ownership filter, authorization check, lifecycle predicate, and client serializer before editing it. A current-event lookup can fall back to an archived event, so availability must come from the appropriate predicate rather than the existence of a returned event.

## Apply the domain rules

Use the target lifecycle and architecture documents to determine intended transitions. RSVP eligibility is schedule-derived and independent of the administrator-controlled contestant-entry state. First voting opening requires event start and frozen candidates, then permanently cuts off new RSVPs and contestant additions/deletions. Reopening voting does not reverse those cutoffs. Results and the party album have separate explicit publication controls.

For schedule changes, trace both scheduled starts through local input, instant storage, and client serialization. There is no scheduled registration end; `rsvpOpen` is derived from `registrationStartsAt`, active edition state, and the permanent first-voting cutoff. Reject invalid and daylight-saving ambiguous/nonexistent local times using the event timezone rather than the machine timezone.

For participant, category, and vote changes, follow the owning event through reads, writes, and guest sessions. Evaluate authorization and public data shaping at the server boundary even when the client already restricts an action. If the requested behavior changes a documented rule, update the authoritative guide alongside the implementation.

## Verify the affected rules

Extend colocated tests with relevant negative cases: another event's records or session, invalid input, unauthorized admin requests, private fields in public responses, ineligible or self-votes, duplicate registration or voting, and unpublished results. Use fixed or injected dates for schedule boundaries; include before, at, and after a changed milestone. Follow the existing route tests' dependency mocks rather than requiring a live database.

Run the code-change checks required by `AGENTS.md`. When UI consumes changed lifecycle behavior, check the corresponding registration, voting, or results states and authentication flow. Report the implemented behavior and validation, including any check that could not run.
