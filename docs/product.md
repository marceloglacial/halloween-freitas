# Product

This document defines the product contract for the Halloween dos Freitas
annual party website. The [glossary](../GLOSSARY.md) defines canonical domain
terms. See the [lifecycle](lifecycle.md), [architecture](architecture.md),
[data model](data-model.md), [testing strategy](testing.md), and
[agent workflow](ai-workflow.md) for behavior and implementation guidance.

## Product goal

Help guests RSVP to a particular annual edition, enter and vote in its costume
contest, and share photos from the party. Give administrators controls for each
edition's lifecycle, contestant eligibility, voting, results, and party album.
The public experience is in Brazilian Portuguese and follows the existing
[design reference](../design.md), including the established homepage section
layout and visual identity.

## Editions and people

Each annual edition is an independent product context with a stable `eventId`,
year, slug, and IANA timezone. An edition can be active or archived; archiving
does not erase its records or public material. A guest may use the same verified
Clerk identity across years but must have an RSVP for each edition to receive
guest permissions there.

At most one edition is active at a time. When none is active, current-edition
reads choose the newest year deterministically for display; its archived state
still blocks RSVP creation and voting. New RSVPs and first-time voting openings
belong only to the active edition. Historical editions remain individually
selectable according to their publication state.

An RSVP records attendance intent. A contestant entry independently represents
an adult's individual entry, a guardian-owned child entry, or a creator-owned
couple/group entry competing in that edition. One adult may own at most one
individual and one couple/group entry per edition; a guardian may create
multiple child entries. Children do not need an RSVP or Clerk account.
Contestant photos belong to entries. The party photo album stores guest uploads
and is separate from contestant entries, contest photos, and voting candidates.

## Guest experience

- Let an adult confirm attendance through an anonymous RSVP using their full
  name and email; the RSVP does not itself create a contestant entry or a
  Clerk account.
- Let a verified guest view and update their own RSVP name for the selected
  edition. Keep email and account identifiers private, and keep a frozen
  contestant display name independent from later RSVP profile edits.
- Show RSVP availability from the edition's scheduled `registrationStartsAt`
  until the first opening of voting. RSVP availability is independent of whether
  contestant entries are open.
- Open contestant entry at the scheduled `registrationStartsAt` instant in the
  edition's timezone. Administrators can close and reopen entries before
  voting first opens. Closing entries freezes the eligible candidate set while
  leaving RSVP available.
- Allow a previously registered guest to verify and link their Clerk identity
  after the RSVP cutoff. Authentication does not create an RSVP or grant access
  to another edition.
- After `eventStartsAt` and contestant freeze, administrators may open voting.
  The first opening permanently cuts off new RSVPs and contestant additions or
  deletions for that edition.
- Let administrators manage event categories before voting first opens; lock
  category configuration once voting begins.
- Let enrolled guests upload multiple party photos after `eventStartsAt`, even
  after voting has frozen contest participation. Tell guests that photos become
  visible to everyone if the administrator publishes the album. Enforce file
  validation and abuse limits, and allow administrators to remove inappropriate
  content safely.
- Show public results and party photos only when their independent publication
  controls allow them.

## Administrator experience

Administrators manage editions, schedules, RSVP availability, contestant entry,
voting rounds, result publication, contestant corrections, and party album
publication. All privileged decisions are enforced server-side and recorded in
an audit history where specified by the lifecycle and architecture contracts.
After voting first opens, an administrator may correct existing guest or
contestant information and photos, but cannot add or delete contestant entries.

## Privacy and isolation

Every RSVP, contestant entry, contest photo, party photo, voting round, ballot,
result, and relevant audit record belongs to one `eventId`. Public operations
never mix editions or expose guest email, Clerk IDs, private drafts, unpublished
ballots, or private party photos. Votes and private photo records remain
unavailable through predictable URLs or stale caches when unpublished.

## Rebuild boundary

This is a clean application and database rebuild. Existing application code is
reference material, not proof that behavior matches this contract. No historical
data migration is required. A destructive database reset is allowed only as an
explicitly approved step of this rebuild; yearly operation never resets prior
editions.
