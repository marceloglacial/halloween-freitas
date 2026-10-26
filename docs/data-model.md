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

| Record                        | Owns or references                                                                                                                                                                                     | Key constraints                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Event**                     | Year, unique slug, IANA timezone, `registrationStartsAt`, `eventStartsAt`, active/archive state, `contestEntryStatus`, first-voting enrollment cutoff, round state, and publication controls           | Stable `eventId`; BSON date instants; unique year and slug; at most one active edition                                                                           |
| **Category**                  | Title, icon, order, and eligibility (`all` or `group`) for one edition                                                                                                                                 | Stable category ID; unique `(eventId, order)`; references never cross editions                                                                                   |
| **RSVP**                      | Attendance name, normalized email, optional linked Clerk user ID, and individual-contest eligibility                                                                                                   | Unique `(eventId, normalizedEmail)` and unique linked `(eventId, clerkUserId)`; eligibility alone never places the RSVP on a ballot                              |
| **Contestant entry**          | Stable candidate `_id`, `eventId`, `categoryId`, `entryType`, `displayName`, `ownerRsvpId`, readiness/consent, and contest-photo reference                                                             | Individual records are created `ready` with their first photo; groups may begin `draft`; unique `(eventId, ownerRsvpId, entryType)`; ballots reference `_id`     |
| **Contest photo**             | One current authenticated Cloudinary asset for a contestant entry, with asset/public IDs, validated format/dimensions/bytes, upload time, and consent actor/time                                       | Scoped through entry and `eventId`; removing an individual photo before voting removes its entry, while group removal returns to draft; cleanup is queued safely |
| **Party album**               | One album-wide publication state and audit history per edition                                                                                                                                         | Unique `eventId`; no per-photo approval state                                                                                                                    |
| **Party photo**               | Stable photo ID, `eventId`, uploader RSVP ID, authenticated Cloudinary asset ID/public ID, validated format/bytes/dimensions, and upload time; removal and cleanup state are added by album management | Uploader RSVP and asset must belong to the same edition; public delivery follows album publication; guest previews are short-lived and RSVP-authorized           |
| **Voting round**              | Stable round ID, type (`primary` or `runoff`), manual state, and frozen category scope                                                                                                                 | Unique round type per edition; at most one open round per edition                                                                                                |
| **Ballot**                    | Stable ballot ID, event, round, category, verified RSVP voter, and stable contestant candidate ID                                                                                                      | Unique `(eventId, roundId, categoryId, voterRsvpId)`; round, voter, category, and candidate all belong to the event                                              |
| **Result publication**        | Edition-wide final-results publication state and actor/time audit                                                                                                                                      | Public only after final round ends and explicit publication                                                                                                      |
| **Admin audit**               | Event, Clerk admin ID, action, target, timestamp, and safe before/after change summary                                                                                                                 | Event-scoped; covers lifecycle, publication, removal, and permitted corrections; never store credentials or duplicate sensitive payloads unnecessarily           |
| **Request rate-limit bucket** | Event, action, HMAC identity, fixed-window count, and expiry                                                                                                                                           | Event/action/window-scoped; no raw email, Clerk ID, or IP; automatically removed by a TTL index                                                                  |

## Identity and references

Clerk IDs are authentication identities, not event memberships. The RSVP is the
per-edition guest link. Verified matching email can claim an unlinked RSVP
atomically; concurrent claims must result in one owner. Admin corrections to an
existing RSVP or contestant are audited and preserve stable references. A
verified guest can view and update only the RSVP name for the selected edition.
An RSVP name/email change never silently changes a frozen contestant identity
or ballot; after contestant enrollment closes, candidate and result views use
the frozen display-name snapshot.

Contestant ownership distinguishes individual entries and creator-owned
couple/group entries. A group creator owns the group entry. Guests may vote for
their own individual entry or a group they created. Voting identity always comes
from the server-verified Clerk-to-RSVP link, never a client-supplied email or
voter ID. Each ballot records that linked RSVP ID, the open round ID, and the
stable contestant entry ID; it never stores a candidate name or photo URL as
ballot identity.

The `contestants` collection is separate from RSVP records. Every entry has a
stable MongoDB `_id`, one `eventId`, one `categoryId`, an `entryType` of
`individual` or `group`, and a `displayName`. Entries reference their creator
through `ownerRsvpId`, which points to an RSVP from the same event. Individual
entries are created as `ready` only with a complete, consented, photo-valid
asset. Group entries may start as private `draft`s and transition to `ready`
after their photo is saved. Freezing eligible entries sets them to `locked`;
`withdrawn` entries are excluded from candidate listings.
An individual entry's `categoryId` is its stable all-eligibility anchor; it
does not restrict voting scope. Locked individual entries are candidates in
every `all`-eligibility category, while group entries remain scoped to their
stored category.

The unique adult ownership index includes `(eventId, ownerRsvpId, entryType)`
and applies only to records with an ObjectId `ownerRsvpId`, so each adult may
own one individual and one group entry per edition. Candidate lookup is indexed
by `(eventId, status, entryType)`. Ballots
reference the contestant entry `_id`; RSVP IDs identify voters and owners, not
candidate targets.

## Isolation and public shapes

Scope all reads, writes, indexes, upload claims, ballot checks, audit lookups,
and cleanup work by `eventId`. Validate that linked references belong to that
same edition before mutation. Public response types expose only the fields
needed for a published candidate, result, or party photo; omit email, Clerk ID,
RSVP details, drafts, private asset identifiers, and unpublished ballots.

MongoDB IDs, Cloudinary public IDs, and Clerk IDs have different roles. Serialize
stable record IDs and dates explicitly at API boundaries. Do not make a
Cloudinary URL itself the authorization mechanism for a private asset.

Contest photos and party photos accept validated JPG, PNG, and WebP uploads up to 8 MB per file. Store
them as authenticated Cloudinary assets in an edition-scoped contest-photo
folder or party-photo folder. Return only short-lived preview URLs to an
authorized guest; never serialize Cloudinary asset/public IDs or consent
ownership to public clients. Party metadata belongs in `partyPhotos`, not
contestant documents; album publication state belongs in the unique
`partyAlbums` record for that event. If metadata persistence fails after an
upload, enqueue its authenticated asset for event-scoped retry cleanup.
Replacement persists the new asset reference before queuing deletion of the
old one. Retry cleanup through durable event-scoped jobs, checking that no
contestant still references an asset before deletion. Keep party-photo assets
in their independent storage flow.
