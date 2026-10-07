# Architecture and domain rules

This document records the boundaries that should remain true as the application
evolves. For setup, configuration, migrations, and deployment, see the
[operations guide](operations.md). For a project overview, see the
[README](../README.md).

## Request flow

The Next.js App Router serves both pages and route handlers. Server components
and handlers call domain helpers in `lib/`; client components call the JSON API
and render interaction state. MongoDB is the system of record, Clerk provides
administrator and guest identity, and Cloudinary stores participant images.

```text
Browser
  |-- public pages ---------> server components -------> lib/* -------> MongoDB
  |-- guest access ---------> Clerk + /api/guest-access -> registration link
  |-- guest voting ---------> Clerk + /api/votes -------> MongoDB
  `-- admin dashboard ------> Clerk + /api/admin/* ----> MongoDB
```

The global Clerk middleware makes authentication context available, but route
handlers remain responsible for authorization. Every administrative handler
must call `isAdmin()` before reading or changing protected data.

## Collections and ownership

The application uses four principal MongoDB collections:

- `events` stores one event per year, its slug, IANA timezone, registration
  schedule, manual voting state, results visibility, and `active` or `archived`
  status.
- `users` stores registrants. Each user belongs to an event through `eventId`;
  `normalizedEmail` is the lookup and uniqueness value. Optional `clerkUserId`
  stores the stable verified owner; missing attendance status means confirmed.
- `categories` stores ordered voting categories and an `all`, `group`, or
  `junior` eligibility rule. Each category belongs to an event.
- `votes` links a voter, candidate, category, and event.

Event and registration references are MongoDB `ObjectId` values; Clerk user IDs
are strings. API serializers expose IDs
as strings and dates as ISO 8601 strings.

Required indexes enforce these invariants:

- one event for each `year` and `slug`;
- at most one active event;
- one registration for each `(eventId, normalizedEmail)` pair;
- at most one linked registration per `(eventId, clerkUserId)` pair, through a
  partial unique index covering string Clerk IDs; and
- one vote for each `(eventId, voterId, categoryId)` tuple.

Queries and mutations for users, categories, and votes must always include the
owning `eventId`. This prevents records from different years from leaking into
one another.

## Event lifecycle

An event schedule contains registration open/close and event start instants, in
that order. Values are stored as BSON dates and interpreted using the event's
IANA timezone. Milestones must be strictly increasing; two milestones cannot
share the same instant.
Registration closing is derived from event start and must always be exactly one
local wall-clock minute earlier.

Voting uses the manual `not_started`, `open`, and `ended` states. Results use a
separate publication flag, but can be published only after voting reaches
`ended`. Reopening voting atomically hides published results. The combined
phases are:

```text
upcoming -> registration -> upcoming -> voting -> awaiting-results -> results
```

An archived event always has the `archived` phase. Only the active event accepts
registrations or can open voting, and voting cannot open before the event start
instant. Guest authentication and registration linking work before voting opens.
Vote-related reads and writes require the selected active event's voting state
to be `open`. Archiving ends open voting. Results
are public only when explicitly published, including for archived events.
At the event start, the homepage replaces registration content with the manual
voting state and polls the current-event endpoint so opening, ending, and result
publication appear without a page reload.

Creating a year copies categories from a selected template event and initially
archives the new event. Activation runs in a transaction: it archives any other
active event and then activates the selected one. This is why the MongoDB
deployment must support transactions.

## Trust boundaries

### Administrator access

Clerk authenticates administrators. Authorization requires the Clerk user to
have `publicMetadata.role === "admin"`; being signed in is not sufficient.
Administrative responses may include participant email addresses.

### Guest access and voting

RSVP is public: name and email confirm attendance without authentication.
Authentication alone never creates or reinstates a registration. Guests use
Clerk-managed Google or email verification codes only when an action requires
identity. The access routes preserve an explicit event and a validated internal
return destination. `/api/guest-access` accepts an event ID, derives identity
from Clerk, and returns only the registered display name. It never accepts a
submitted email or voter ID as identity proof.

The server first resolves an existing `(eventId, clerkUserId)` link. For initial
linking, exactly one event registration must match the account's normalized,
verified email addresses. An atomic claim includes event, registration, email,
unlinked ownership, and non-cancelled status. Concurrent or ambiguous ownership
is rejected without transferring access. Missing legacy links are claimed on
verified access; there is no bulk linking, registration ID replacement, or vote
migration. Deleted or cancelled registrations cannot authorize voting. Status
omitted on legacy and admin-created records means confirmed; cancellation
management belongs to F02.

Once linked, the stable Clerk ID remains authoritative even if either stored
email changes. Ordinary edits never update the link or guest display name from
Clerk profile data. Hosts can explicitly reset a link in the participant editor;
the admin endpoint compares the expected current Clerk ID before clearing it.
Correct and save the registration email first when the previous account should
no longer be able to claim it. Resetting preserves registration IDs and votes;
only a newly verified matching email can claim the released registration.

Every protected voting handler and server-rendered page resolves the current
registration, then enforces event and voting availability. Candidate reads and
vote writes exclude cancelled candidates, while historical results and portraits
remain intact. A voter cannot vote for themself, candidates must satisfy category
eligibility, and each voter has one vote per category.

The old `/api/guest-session` endpoint returns 410. Existing `guest_session`
cookies grant no access and are ignored; `SESSION_SECRET` is no longer used.
Clerk controls code expiration, resend throttling, sessions, and OAuth account
linking. No custom authentication tokens or mail service are introduced.

### Public data

Public candidate, gallery, and result shapes exclude email addresses, Clerk
ownership, and attendance status. Results handlers
must enforce the manual publication state before returning vote totals. Errors sent
to users are intentionally generic; detailed failures belong in server logs.

## Where changes belong

- Put schedule calculations and event lookup behavior in `lib/events.ts` or
  `lib/event-schedule.ts`.
- Put request parsing, normalization, and common error responses in
  `lib/http.ts`.
- Put reusable database queries in `lib/` rather than duplicating them across
  page and API code.
- Keep authorization in server modules under `lib/auth/` and re-check it at
  every protected handler.
- Add tests beside the helper or route they exercise. Security and lifecycle
  regressions should include negative cases and boundary timestamps.
