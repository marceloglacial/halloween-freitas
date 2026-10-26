# Architecture

This document defines the target system boundaries for the clean rebuild. It
supersedes architecture descriptions tied to the legacy application. Read the
[product contract](product.md), [lifecycle](lifecycle.md), and
[data model](data-model.md) together; use [operations](operations.md) for
environment and deployment guidance.

## Application boundaries

The application uses Next.js App Router with React, TypeScript, and Tailwind
CSS. Server components and route handlers own database access, identity
resolution, authorization, lifecycle decisions, upload authorization, and
public response shaping. Client components provide interaction and display
server-authorized state; hiding controls never substitutes for server checks.

MongoDB stores edition and guest-domain records. Clerk verifies guest and
administrator identities. Cloudinary stores contest and party images in
separate asset flows. Keep provider credentials and private asset authorization
on the server. Preserve the stack and homepage visual layout described in
[`design.md`](../design.md).

## Edition and data ownership

`eventId` is the canonical key for an annual edition. `year` and `slug` are
labels and navigation keys, not substitutes for ownership. Every guest,
contestant, asset, round, ballot, result, and audit operation is scoped to one
edition. Validate same-edition ownership across every reference before reading,
mutating, publishing, or deleting associated data.

Maintain unique event year and slug, at most one active edition, one RSVP per
`(eventId, normalizedEmail)`, and one linked RSVP per
`(eventId, clerkUserId)`. Enforce ballot uniqueness for
`(eventId, roundId, categoryId, voterRsvpId)`. Use database uniqueness and
atomic conditional writes for concurrency-sensitive ownership and lifecycle
cutoffs; application prechecks alone are insufficient.

When no edition is active, current-edition reads choose the highest year, with
stable ID ordering as a tie-breaker. This fallback is display-only; RSVP and
voting mutations still require `status === "active"`.

Historical editions remain available according to their publication and
authorization states. Annual rollover creates or activates another edition;
it never resets or repurposes prior-edition data.

## Identity and authorization

Clerk identifies a signed-in adult. A verified RSVP link grants only the
guest permissions associated with that RSVP's edition. The server derives the
RSVP and voter identity from the verified Clerk session and event-scoped link;
client-supplied email, RSVP ID, or voter ID is never identity proof. Link an
unlinked RSVP only through a verified matching email and an atomic claim. Apply
abuse limits to RSVP and linking operations without revealing whether another
email or RSVP exists. Reject ambiguous matches, mismatched event IDs, and links
owned by another Clerk user.

Apply fixed-window limits to public RSVP attempts by trusted client address and
HMAC of the normalized email, and to guest-link attempts by trusted client
address. Keep counters scoped to the event and action, store no raw address or
email in limiter records, and expire buckets with a MongoDB TTL index. In
production, trust `x-real-ip` only when the reverse proxy overwrites it; reject
requests when that trusted address is unavailable.

Administrator authorization is server-side and deny-by-default. Clerk users
must have `publicMetadata.role === "admin"`. Protect every administrative page
action, API operation, upload, publication, removal, and correction
independently. Record the acting admin and timestamp for sensitive
lifecycle and data corrections. Delegated jobs and background cleanup must
retain the event and asset ownership context from their authorized request.

## Lifecycle as a shared domain service

Represent transitions and eligibility as server-side domain operations shared
by UI loaders, route handlers, and background tasks. `rsvpOpen` and contest
entry availability are derived from `registrationStartsAt`, active edition
state, the event-scoped `contestEntryStatus` close/reopen override, and the
permanent first-voting cutoff. The two scheduled starts, unified enrollment
control, voting rounds, results publication, and party album publication follow
[lifecycle.md](lifecycle.md).

The first successful voting opening must atomically verify that the edition has
started and contestant eligibility is frozen, then record the permanent RSVP
and contestant add/delete cutoff before accepting ballots. RSVP writes,
contestant writes, and entry-state changes serialize through an event-scoped
transactional guard against that cutoff. Manual enrollment closure serializes
with RSVP, group, and individual-photo writes. Closing or reopening a round
preserves the permanent cutoff and prior ballots.

Category configuration is event-scoped and editable only before the first
voting opening. Serialize category saves with the event's voting transition,
preserve category IDs during edits and reorder, and prevent removal while
ballots reference a category.

Use stable contestant IDs for ballots. Administrative corrections after first
opening preserve IDs and ballots, and append an audit record. Never implement a
contestant addition/deletion as an edit to a frozen candidate.

## Admin event command center

The admin shell resolves the requested year against stored editions. The year
is a navigation key; server-side reads and writes use the resolved `eventId`.
The overview is a server-owned, event-scoped projection of RSVP, contestant,
vote, category, and album data. Its lifecycle status and contextual links are
derived from that selected edition. Links navigate to feature routes; each
page action and `/api/admin/*` handler independently enforces administrator
authorization and its lifecycle preconditions. With no edition, the overview
shows first-edition setup and does not request event metrics.

## Photo and publication boundaries

Contest photos and party photos are different domain assets with different
owners, eligibility, and publication rules. An RSVP authorizes individual
participation, while its first valid contest-photo save atomically materializes
the contestant entry. A contestant entry has its own
authenticated Cloudinary contest photo and readiness state. Accept only
validated JPG, PNG, or WebP content within the documented size/dimension limit;
record the consenting RSVP and time. Keep draft previews temporary and
owner-authorized, and do not expose Cloudinary asset/public IDs in public
responses. Persist a replacement before queuing old-asset deletion; cleanup
must retry safely and verify no contestant still references the asset. A party
photo belongs to its uploader RSVP and one event's party album. Do not reuse
contest image rows or contestant APIs for the party album.

Use signed uploads and private, server-authorized, event-scoped delivery for
party photos. Validate actual file type and size, rate-limit abusive upload
attempts and ballot submissions, and allow administrators to remove
inappropriate content. An unpublished album must not expose images through
public response data, server-rendered markup, caches, or predictable permanent
asset URLs. The public gallery list and server-rendered page recheck publication
and disable caching; they return only event-scoped application image paths and
display dimensions. Each image request independently checks that the selected
edition's album is published and the photo is retained, then streams the private
Cloudinary image without exposing its asset or public ID. Publishing is one
album-wide event-scoped action. Unpublishing revokes application access and
invalidates relevant caches; photo removal hides the record immediately and
queues idempotent Cloudinary cleanup with retries. If metadata persistence
fails after upload, remove the orphan asset through the same safe cleanup path.

Results use a separate explicit publication state, available only after the
final round ends. Public candidate, result, and party-photo serializers emit
only fields needed for that public view. Never expose guest email, Clerk IDs,
attendance details, private contestant drafts, unpublished ballots, or private
asset identifiers.

## Persistence and failure handling

Use transactions or conditional updates where multiple records must change
together, especially first voting opening, active edition selection, ballot
uniqueness, publication transitions, and destructive asset workflows. Keep
Cloudinary cleanup retryable: an external deletion failure must not restore a
removed photo to public results. Make repeated cleanup safe.

Store schedule values as instants and retain the event's IANA timezone for
display and local-date validation. Reject nonexistent local times around
daylight-saving changes. Serialize IDs and dates explicitly at API boundaries.

## Cross-cutting references

- [Product scope and privacy](product.md)
- [State transitions and cutoff rules](lifecycle.md)
- [Entities, references, and uniqueness](data-model.md)
- [Test matrix](testing.md)
- [Agent implementation and review workflow](ai-workflow.md)
