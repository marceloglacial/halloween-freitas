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

An RSVP records attendance intent and makes that adult eligible to enter the
individual costume contest. The individual contestant entry is materialized
only when the guest saves a valid, consented contest photo. A creator-owned
couple/group entry remains a separate explicit registration. One adult may own
at most one individual and one couple/group entry per edition.
An individual entry does not select a category and is eligible in every
category open to all contestant types. Group-only categories remain restricted
to group entries and are assigned by the server when the entry is created;
guests do not choose a category for that entry type.
Contestant photos belong to entries. The party photo album stores guest uploads
and is separate from contestant entries, contest photos, and voting candidates.

## Guest experience

- The homepage's “Premiação para as Categorias” section uses the stored
  categories of the active edition, preserving their configured names, icons,
  and order. A homepage data refresh reflects category changes; without an
  active edition, the waiting page omits the awards section.
- Let an adult confirm attendance through an anonymous RSVP using their full
  name and email. The RSVP grants individual-contest eligibility but does not
  create a contestant entry until a photo is saved, and it does not create a
  Clerk account.
- After `eventStartsAt`, show a homepage action beside the RSVP call to action
  that takes guests through login to the selected edition's party-photo upload
  area, even after RSVP closes.
- Let a guest enter the RSVP email to access and update their RSVP name for the selected
  edition. Keep email and account identifiers private, and keep a frozen
  contestant display name independent from later RSVP profile edits.
- Let guests stage an optional costume title and required photo for individual
  entries, preview the selected photo, and save both with one explicit action.
  Saving the first valid, consented photo creates the individual entry; removing
  that photo before voting removes the entry. A group entry's name is its
  costume name, and its creator can edit
  that name while entries are open. Require consent when uploading a new photo,
  and allow guests to remove their saved photo while contestant entries are
  open.
- Open the unified RSVP and contest-entry window at the scheduled
  `registrationStartsAt` instant in the edition's timezone. Administrators can
  close and reopen that window before voting first opens. Closing it stops new
  RSVPs and contest additions or edits and freezes the eligible candidate set.
- Guest access uses an application session scoped to one RSVP and edition;
  Clerk is reserved for administrators. Access is based on the entered email
  without mailbox verification, so anyone who knows that email can act as that
  guest.
- After `eventStartsAt` and contestant freeze, administrators may open voting.
  The first opening permanently cuts off new RSVPs and contestant additions or
  deletions for that edition.
- Allow a guest to vote for their own individual or group entry, subject to
  normal category eligibility and one-ballot-per-category rules.
- Let administrators manage event categories before voting first opens; lock
  category configuration once voting begins.
- Let enrolled guests upload multiple party photos after `eventStartsAt`, even
  after voting has frozen contest participation. Tell guests that photos become
  visible to everyone if the administrator publishes the album. Let each guest
  remove their own photos individually or all at once. Enforce file validation
  and abuse limits, and allow administrators to remove inappropriate content
  safely.
- Show public results and party photos only when their independent publication
  controls allow them.
- Present published category results as a manual reveal: podium places appear
  third, second, and first using the keyboard's right and left arrow keys. Each
  podium trophy is visible from the start; for each participant, reveal vote
  totals before the full profile. The next reveal after the first-place group
  shows all remaining participants together.

## Administrator experience

Administrators manage editions, schedules, RSVP availability, contestant entry,
voting rounds, result publication, contestant corrections, and party album
publication. Selecting a guest opens an edition-scoped detail page for RSVP
corrections, registering individual and group costumes, contestant photo
management, and permitted costume or guest removal. All privileged decisions
are enforced server-side and recorded in an audit history where specified by
the lifecycle and architecture contracts.
After voting first opens, an administrator may correct existing guest or
contestant information and photos, but cannot add or delete contestant entries.
Every newly created edition starts with these six event-scoped costume
categories in order: 🏆 Melhor Fantasia, 💩 Pior Fantasia, 🧟 Fantasia Mais
Assustadora, 🤡 Fantasia Mais Engraçada, 👯‍♀️ Melhor Fantasia de Grupo ou
Dupla, and 🔥 Fantasia Mais Sexy. Administrators
can review and edit the new edition's categories before voting opens. Creating
an edition never changes categories belonging to an existing edition.

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
