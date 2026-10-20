# Testing strategy

Tests protect the annual-edition product contract in
[product.md](product.md), [lifecycle.md](lifecycle.md),
[architecture.md](architecture.md), and [data-model.md](data-model.md). Use
fixed or injected instants and event timezones; do not make lifecycle assertions
depend on wall-clock time.

Each changed feature should include successful behavior, malformed and invalid
input, expected failure status, unauthorized access, concurrent requests, and
cross-edition isolation cases where they apply.

## Domain and schedule tests

- Create a new edition and verify its transaction seeds exactly the seven
  standard Portuguese categories, once, in the specified order and with
  event-specific eligibility. Verify duplicate event creation does not create
  another category set, and existing editions' category records are unchanged.
- Render the homepage awards section from the active edition's stored category
  names, icons, and ordering. After category changes, verify the next no-store
  refresh reflects the changes; with no active edition, keep the waiting page
  and omit the awards section.
- Validate both scheduled starts, ordering, IANA timezones, malformed input,
  daylight-saving gaps, and the exact before/at/after behavior of each boundary.
- Verify `rsvpOpen` derives from registration start, active edition, and the
  permanent first-voting cutoff, independently of contestant-entry state.
- Exercise contestant entry open/close/reopen, freeze, incomplete drafts,
  consent/photo eligibility, and attempts to add/edit while closed.
- Verify a linked guardian can add multiple child entries only to junior
  categories in the selected edition; each entry uses the child's name,
  remains a private draft without its required photo and guardian consent, and
  cannot be created after the first-voting cutoff.
- Verify a linked guest can create one group entry in an eligible group
  category per edition; use the creator's RSVP, reject a second entry even
  under concurrency, keep entries private until a valid photo is uploaded, and
  permit the creator to vote for the group.
- Verify voting cannot open before `eventStartsAt` or before eligible candidates
  are frozen; first opening atomically ends new RSVP and contestant membership
  changes.
- Verify closing/reopening a voting round preserves ballots and never removes
  the enrollment cutoff. Cover primary and runoff candidate selection, ties,
  zero-vote categories, and final results eligibility.

## Identity, authorization, and isolation tests

- Cover unregistered, unverified, mismatched, ambiguous, and already-linked
  guest identities, including concurrent RSVP claims.
- Exercise RSVP and guest-link rate limits at their threshold, across window
  expiry, under concurrency, and across editions; verify generic `429` responses
  and that limiter records contain no raw email, Clerk ID, or client address.
- Cover authorization denial for every protected admin and guest operation;
  forged client email, RSVP ID, or voter ID must not change server-derived
  identity.
- Verify guests can read and update only their own RSVP name for the selected
  edition, that email/account identifiers stay private, and that a profile
  edit after contestant enrollment closes does not change a frozen candidate
  name.
- Create at least two editions in fixtures and prove that guest links,
  contestants, categories, uploads, ballots, results, audit records, and cleanup
  cannot cross the `eventId` boundary.
- Assert public serializers omit email, Clerk IDs, RSVP details, private drafts,
  unpublished ballots, and private asset identifiers.

## Voting and concurrency tests

- Enforce one ballot per verified RSVP, category, round, and edition under
  simultaneous requests.
- Cover category eligibility, individual entries in every `all` category,
  individual self-voting, guardian voting for a child, and creator voting for a
  couple/group entry.
- Race first voting opening against new RSVP and contestant requests; only
  operations ordered before the cutoff may succeed. Race close/reopen and ballot
  submission and assert no duplicate or lost ballot.
- Verify stable contestant IDs keep historical ballots attached through
  permitted admin corrections.

## Photo, publication, and cache tests

- Reject uploads before `eventStartsAt`, from users without an RSVP in the same
  edition, invalid files, oversize files, and rate-limit abuse.
- Verify multiple party uploads do not alter contestant photos/readiness;
  allow only JPG, PNG, and WebP files up to 8 MB each; and keep assets private
  until album publication.
- Verify guest photo reads return only that RSVP's event-scoped photos with
  short-lived private preview URLs, never Cloudinary asset/public IDs.
- Verify the upload rate limits are event-scoped, concurrency-safe, expire, and
  store only HMAC identities; verify failed metadata writes enqueue orphan
  cleanup and retry Cloudinary deletion safely.
- Verify post-publication uploads appear by default, album unpublish revokes
  public API/rendered/cache access, and republish exposes only retained photos.
- Verify the public party-gallery route and API return no photos, photo IDs,
  dimensions, uploader details, or Cloudinary identifiers for a private album;
  published edition selection never mixes years.
- Verify removal disappears from the public gallery immediately, new uploads
  appear on refresh while published, and a large album renders lazy thumbnails
  with a keyboard-accessible enlarged viewer.
- Verify removals disappear immediately even when Cloudinary deletion fails;
  retry cleanup safely and never affect contestant assets.
- Verify results remain private until final voting ends and an administrator
  publishes; unpublish or reopening hides them from APIs, SSR, and caches.

## UI and operational checks

For UI changes, exercise mobile and desktop layouts plus loading, empty, error,
pending, denied, and published/private states. Check keyboard access and
Portuguese messages. For runtime-sensitive changes, follow the
[Next.js development loop](../.agents/skills/next-dev-loop/SKILL.md).

For persistent navigation, verify the floating desktop pill stays at the top of
the viewport on the homepage and internal routes. At tablet widths, exercise the
right-side drawer; on phones, exercise the bottom-inset menu panel. Open and
close each with its button, overlay, Escape, and a route link; verify focus
returns to the menu button, background scrolling is locked while open, reduced
motion is respected, and active routes are announced.
Confirm voting is absent before it opens and after it closes, with no
placeholder label; it appears only for an active edition whose authoritative
voting state is open. Confirm party album navigation is absent for missing,
empty, private, or unpublished albums, prefers a published active-edition
album, and falls back to the newest published archive (including when there is
no active edition). Verify the desktop navigation and mobile drawer show the
same eligible links, while direct album and voting routes continue to enforce
their server-side publication and lifecycle checks. Contestant photos and the
party album stay separate, and Sair appears only for signed-in users.

### Admin dashboard lifecycle matrix

Use fixed event fixtures and an injected `now` for `/dashboard`. The overview
must use the selected edition's data and offer links only to relevant
administration sections. API authorization and lifecycle guards remain the
source of truth for mutations.

| Fixture state                         | Expected overview state and action                                                                                                  | Must not suggest                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| No edition                            | Explain that no edition exists and link to settings to create the first one                                                         | KPIs, event dates, or lifecycle actions                |
| Before registration start             | Show upcoming confirmations and their localized start; offer edition setup                                                          | Open RSVP or voting actions                            |
| Registration available                | Show confirmations open and link to guest management                                                                                | Voting before event start and contestant-entry closure |
| Event started, contest entries open   | Show the next action to close contest entries and preserve RSVP availability                                                        | First-vote action before the contestant set is frozen  |
| Event started, contest entries closed | Show voting ready for the administrator; offer first-vote controls for the active edition                                           | A first-vote action for an archived edition            |
| Voting open                           | Show voting in progress and link to voting administration                                                                           | Results publication                                    |
| Voting ended, results private         | Show results awaiting publication and link to publication controls                                                                  | Public results                                         |
| Voting ended, results published       | Identify publication and retain links to historical results and album administration                                                | A second publish action                                |
| Archived edition                      | Identify archived state, keep selected-year links and historical reads; preserve server-supported result/album publication controls | RSVP creation or first voting opening                  |

Automated coverage for the overview matrix belongs in
`components/dashboard/admin-event-overview.test.tsx`; route tests cover no
edition, selected archived edition, legacy deep links, authorization denial,
and aggregate failure. Keep dates fixed at or around the relevant instant so
boundary expectations do not depend on wall-clock time.

For dashboard manual review, check desktop and narrow mobile widths, keyboard
focus visibility, active navigation announcement, year switching and browser
back, and the native mobile drawer's Escape, overlay, route-link, and focus
restoration behavior. Verify overview errors and empty states, then visit each
linked route using an active edition and an archived edition. Confirm every
mutation is still rejected by the server when authorization or lifecycle
preconditions fail; a hidden or disabled control is not authorization.

For application code changes, run `pnpm test`, `pnpm lint`, and `pnpm build`.
For documentation-only changes, check Markdown formatting and local links.
Never point a test at a production database or run a destructive database
operation as a substitute for an isolated fixture.
