# Edition lifecycle

This document defines the independent RSVP, contestant-entry, voting, results,
and party-album transitions for each edition. See [product](product.md) for
user-facing scope and [architecture](architecture.md) for trust boundaries.

## Scheduled starts

An edition has two scheduled start instants: `registrationStartsAt` and
`eventStartsAt`. Both are interpreted in the edition's IANA timezone and
persisted as instants. `eventStartsAt` must be at or after
`registrationStartsAt`. Neither start has a scheduled end; the applicable
administrator transition supplies the cutoff. Reject malformed local dates,
invalid timezones, and nonexistent or ambiguous daylight-saving local times.

## RSVP availability

RSVP becomes available at `registrationStartsAt`. It remains available
independently of contestant-entry state, including while entries are closed and
through the pre-voting part of the event. The first successful opening of voting
atomically establishes the permanent enrollment cutoff and closes new RSVP
creation. Only the active edition accepts new RSVPs. Closing or reopening a
voting round never reverses this cutoff.

RSVP is per edition and unique by normalized email within that edition. A
verified Clerk account can link to an existing RSVP by a matching verified
email. Linking never creates an RSVP, changes its event, transfers an existing
link silently, or allows one edition's RSVP to authorize another.

## Contestant entries

Contestant entry opens at `registrationStartsAt` in the edition's IANA timezone,
unless an administrator closes it. Administrators can close and reopen entries
before voting first opens. The event stores this administrator-controlled
override as `contestEntryStatus`; legacy records without the field are treated
as open until their scheduled start. While entries are closed, guests cannot
add or edit contestant entries or photos; eligible candidates are frozen for
voting. Only complete, consented, photo-valid entries are eligible; incomplete
drafts remain private. Reopening before the first voting opening permits the
entry workflow again, but does not change RSVP availability.

For individual entries, guests edit the optional title and select or remove the
contest photo before saving. A selected image is previewed locally and is not
uploaded until the guest explicitly saves; a new upload requires consent. A
group entry uses its name as the costume name and saves its photo separately.
Removing a saved photo returns the entry to `draft` and queues safe asset
cleanup. The guest editor is unavailable after entries close or voting freezes
the candidate set.

When voting first opens, contestant membership is permanently frozen for that
edition. No guest or administrator can add or delete contestant entries after
that point. Administrators may correct existing guest/contestant fields and
replace existing contestant photos; retain stable contestant and ballot IDs,
and audit those corrections. Incomplete drafts remain private and cannot enter
the ballot. Eligibility requires the configured category, consent, and required
contest photo to be valid at freeze time.

Administrators can edit category names, icons, eligibility, and order, and can
add or remove categories before voting first opens. The first voting opening
permanently locks category configuration for the edition. A category with
existing ballots cannot be removed; category IDs remain stable when categories
are edited or reordered.

## Voting rounds

Voting is manual, event-scoped, and requires both `eventStartsAt` to have passed
and contestant membership to be frozen. Only the active edition can open a
round. The first opening permanently closes new RSVP and contestant add/delete
operations. Existing RSVP guests can still authenticate and vote afterward.

An edition has one primary round and may have one runoff round. A round has a
stable ID, a type (`primary` or `runoff`), an `open` or `ended` state, and a
frozen category scope. The first opening of voting creates the primary round in
the same transaction as the permanent enrollment cutoff. Only one round is
open at a time. Closing a round preserves its ballots. Reopening the same round
accepts only missing ballots and does not reopen enrollment or restore
contestant editing. The runoff contains only candidates tied for first place in
the primary round; if the runoff also ties, the tied candidates share first
place. A category with no ballots has no winner.

Each ballot is scoped by event, round, category, and verified RSVP identity, and
has a stable ID referencing the contestant entry ID. A unique database index
enforces one ballot per eligible RSVP/category/round under concurrency. Guests
may vote for their own individual entry or a group they created. Candidate
eligibility is determined from the
frozen set, not current RSVP or profile fields. Individual entries appear in
every category whose eligibility is `all`; they do not appear in group-only
categories. The entry's stored category reference does not limit its voting
scope.

## Results publication

Results can be published only after the final round has ended and an
administrator explicitly publishes them. An administrator may unpublish and
republish results. Reopening voting automatically unpublishes results while
preserving ballots. Public pages, APIs, server rendering, and caches must all
enforce the current publication state.

## Party album publication

After `eventStartsAt`, a verified Clerk user linked to an RSVP for the same
edition may upload multiple party photos. This remains allowed after contest
entry closes and after voting opens. Uploading party photos never changes
contestant photos, contestant readiness, or ballots.

All party photos remain private until an administrator publishes the edition's
album. One album-wide control publishes or hides all retained photos; there is
no per-photo approval step. Uploads added after publication appear under the
published album by default. Removing a photo makes it unavailable from
application responses immediately and queues safe Cloudinary cleanup with
retry. Hiding the album revokes public access
through routes, delivery URLs, server rendering, and cache revalidation.

## Transition overview

```text
RSVP:             scheduled start ─────────────── first voting open (permanent cutoff)
Contest entries:  admin opens ⇄ admin closes ───── first voting open (permanent freeze)
Voting:           not_started → open ⇄ ended → [one runoff] → ended
Results:          private ──────────────────────── admin publishes ⇄ unpublishes
Party album:      private ──────────────────────── admin publishes ⇄ unpublishes
Party uploads:    eventStartsAt ────────────────── allowed while album is private or public
```

Archiving an edition does not delete its records or bypass per-edition
authorization and publication checks. Previously published historical results
and party albums remain available until an administrator unpublishes them.
