---
name: halloween-event-workflows
description: Change Halloween Freitas event schedules, registration, guest voting, authorization, or results publication. Use for domain behavior and related API regressions; ordinary visual styling does not require this skill.
---

# Halloween Event Workflows

Read the [architecture guide](../../../docs/architecture.md) before changing domain behavior. It is authoritative for lifecycle, ownership, and trust boundaries. Resolve code paths below from the repository root, three directories above this skill. Follow the root contributor instructions, including the installed Next.js guides when writing framework code.

## Trace the affected behavior

Choose the relevant starting points rather than loading every subsystem:

- **Schedules and lifecycle:** `lib/event-schedule.ts` handles local schedule input and timezone conversion; `lib/events.ts` resolves events and exposes lifecycle predicates. Follow mutations into `app/api/admin/events/` and homepage consumers when their behavior is affected.
- **Registration:** `app/api/registrations/route.ts`, `lib/users.ts`, and `lib/http.ts` connect event availability, normalized identity, and request validation.
- **Guest identity and voting:** `lib/auth/guest-session.ts`, `app/api/guest-session/route.ts`, and `app/api/votes/route.ts` establish and verify identity. Follow candidate eligibility into `lib/voting.ts` and category lookup helpers.
- **Admin access and public results:** `lib/auth/admin.ts` supplies authorization; protected handlers enforce it. Trace result visibility and public serialization through `lib/results.ts` and the relevant API handler.

For each affected operation, identify its event lookup, ownership filter, authorization check, lifecycle predicate, and client serializer before editing it. A current-event lookup can fall back to an archived event, so availability must come from the appropriate predicate rather than the existence of a returned event.

## Apply the domain rules

Use the architecture guide's lifecycle and trust-boundary sections to determine the intended transitions. Registration follows the schedule; voting and results depend on administrator-controlled state. Changing a timestamp must not accidentally substitute for a manual transition.

For schedule changes, trace local input through parsing, BSON storage, and client serialization. Preserve the documented local wall-clock relationship between registration closing and event start; use the event timezone rather than the machine timezone.

For participant, category, and vote changes, follow the owning event through reads, writes, and guest sessions. Evaluate authorization and public data shaping at the server boundary even when the client already restricts an action. If the requested behavior changes a documented rule, update the authoritative guide alongside the implementation.

## Verify the affected rules

Extend colocated tests with relevant negative cases: another event's records or session, invalid input, unauthorized admin requests, private fields in public responses, ineligible or self-votes, duplicate registration or voting, and unpublished results. Use fixed or injected dates for schedule boundaries; include before, at, and after a changed milestone. Follow the existing route tests' dependency mocks rather than requiring a live database.

Run the code-change checks required by `AGENTS.md`. When UI consumes changed lifecycle behavior, check the corresponding registration, voting, or results states and authentication flow. Report the implemented behavior and validation, including any check that could not run.
