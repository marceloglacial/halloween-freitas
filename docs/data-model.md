# Data model

This is the target domain model for the clean rebuild. The current implementation
may differ until its rebuild issues are complete. See [architecture](architecture.md)
for boundaries and [lifecycle](lifecycle.md) for transitions.

## Ownership rule

`eventId` is the canonical annual-edition key. Every RSVP, contestant entry,
contest photo, party album/photo, voting round, ballot, result, and event-scoped
audit record belongs to exactly one edition. References and unique constraints
include `eventId`; no query infers an edition from the latest year or Clerk
identity alone.

## Records

| Record                 | Owns or references                                                                                                                                                                           | Key constraints                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Event**              | Year, unique slug, IANA timezone, `registrationStartsAt`, `eventStartsAt`, active/archive state, `contestEntryStatus`, first-voting enrollment cutoff, round state, and publication controls | Stable `eventId`; BSON date instants; unique year and slug; at most one active edition                                                                                                                       |
| **Category**           | Title, icon, order, and eligibility (`all`, `group`, or `junior`) for one edition                                                                                                            | Stable category ID; unique `(eventId, order)`; references never cross editions                                                                                                                               |
| **RSVP**               | Attendance name, normalized email, optional linked Clerk user ID                                                                                                                             | Unique `(eventId, normalizedEmail)` and unique linked `(eventId, clerkUserId)`                                                                                                                               |
| **Contestant entry**   | Stable candidate identity, category/type, owner or guardian, display fields, readiness/consent, and contest-photo reference                                                                  | Draft, ready, locked, or withdrawn; at most one individual and one creator-owned couple/group per adult per edition; multiple guardian-owned children allowed; drafts remain private; ballots use stable IDs |
| **Contest photo**      | One current Cloudinary asset for a contestant entry, with public ID and validated metadata                                                                                                   | Scoped through entry and `eventId`; replacement preserves contestant ID and triggers safe old-asset cleanup                                                                                                  |
| **Party album**        | One album-wide publication state and audit history per edition                                                                                                                               | Unique `eventId`; no per-photo approval state                                                                                                                                                                |
| **Party photo**        | Stable photo ID, `eventId`, uploader RSVP ID, Cloudinary public ID, dimensions/metadata, upload time, removal and cleanup state                                                              | Uploader RSVP and asset must belong to the same edition; public delivery follows album publication                                                                                                           |
| **Voting round**       | Stable round ID, type (`primary` or `runoff`), manual state, and candidate/category scope                                                                                                    | Unique round identity per edition and type; at most one open round                                                                                                                                           |
| **Ballot**             | Stable ballot ID, event, round, category, verified RSVP voter, and contestant candidate                                                                                                      | Unique `(eventId, roundId, categoryId, voterRsvpId)`; all references share the event                                                                                                                         |
| **Result publication** | Edition-wide final-results publication state and actor/time audit                                                                                                                            | Public only after final round ends and explicit publication                                                                                                                                                  |
| **Admin audit**        | Event, Clerk admin ID, action, target, timestamp, and safe before/after change summary                                                                                                       | Event-scoped; covers lifecycle, publication, removal, and permitted corrections; never store credentials or duplicate sensitive payloads unnecessarily                                                       |

## Identity and references

Clerk IDs are authentication identities, not event memberships. The RSVP is the
per-edition guest link. Verified matching email can claim an unlinked RSVP
atomically; concurrent claims must result in one owner. Admin corrections to an
existing RSVP or contestant are audited and preserve stable references. An RSVP
name/email change never silently changes a frozen contestant identity or ballot.

Contestant ownership distinguishes individual entries, guardian-owned child
entries (the `junior` category), and creator-owned couple/group entries. A
guardian supplies consent for a child entry; a group creator owns the group
entry. A guardian or group creator can vote for their own child/group as allowed
by the contest rules; an individual cannot vote for their own individual entry.
Voting identity always comes from the server-verified Clerk-to-RSVP link, never
a client-supplied email or voter ID.

## Isolation and public shapes

Scope all reads, writes, indexes, upload claims, ballot checks, audit lookups,
and cleanup work by `eventId`. Validate that linked references belong to that
same edition before mutation. Public response types expose only the fields
needed for a published candidate, result, or party photo; omit email, Clerk ID,
RSVP details, drafts, private asset identifiers, and unpublished ballots.

MongoDB IDs, Cloudinary public IDs, and Clerk IDs have different roles. Serialize
stable record IDs and dates explicitly at API boundaries. Do not make a
Cloudinary URL itself the authorization mechanism for a private asset.
