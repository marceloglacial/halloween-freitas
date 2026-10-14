# QA-01 Release QA report

**Status:** Incomplete. Automated checks pass, and the isolated QA editions
verified contestant, voting, results, reopening, and party-photo lifecycles.
The tie and runoff lifecycle passed with two candidates, but only one guest
submitted ballots through the browser; the second guest's ballots were fixture
seeded because a second verified development identity was unavailable. Full
cross-edition contestant, ballot, and result checks remain unverified. The 2027
party gallery remains unverified until its scheduled event start. E05 is not
ready to close.

## Automated checks

| Check                | Result                    | Evidence                                                                                        |
| -------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm test`          | Pass: 69 files, 395 tests | Includes the new reduced-motion background-video regression test.                               |
| `pnpm lint`          | Pass                      | Completed in the dedicated #81 worktree.                                                        |
| `pnpm build`         | Pass                      | Next.js 16.4 production build and TypeScript completed with the development environment linked. |
| Markdown checks      | Pass                      | `pnpm check:docs`; formatting and local links passed.                                           |
| Next.js compilation  | Pass                      | `get_compilation_issues` returned no issues. Browser console showed no errors.                  |
| Next.js `get_errors` | Pass                      | `get_errors` returned no configuration or session errors.                                       |

## Post-merge verification — October 14, 2026

After QA-01's report was merged into local `main`, the integrated code passed
`pnpm test` (69 files, 395 tests), `pnpm lint`, and `pnpm build` on Next.js
16.4. The build completed TypeScript checks and generated all 18 static pages.
This verification did not change event data or schedules.

## Earlier authenticated 2026 walkthrough

Using authenticated admin and guest sessions, the earlier walkthrough verified:

- A verified RSVP guest uploaded two party photos after event start while
  voting was open.
- The private album page and API exposed no photos before publication.
- Publishing exposed the photos; an upload made while published appeared
  automatically. Public responses omitted uploader and Cloudinary identity
  fields.
- Admin removal removed photos from public responses, and unpublishing hid the
  album.
- Reopening voting hid published contest results; ending voting and
  republishing restored the 2026 results page.
- A guest linked to a 2026 RSVP was denied 2027 access until the same verified
  Clerk account completed a fresh 2027 RSVP, after which 2027 guest access
  succeeded.
- A 2027 contestant draft stayed out of the public gallery. The 2027 edition
  was archived and 2026 restored as active; the test RSVP and incomplete draft
  remain in development data.

That walkthrough removed its temporary party photos through the admin UI, but
did not independently verify deletion at Cloudinary. Its contestant-photo
upload was interrupted by a browser crash; no successful upload was observed
for that draft.

## Current browser checks

The development-only environment was linked into the #81 worktree. The active
edition was 2026 (results phase, contestant entry closed, voting ended, results
published). No schedule or database reset was performed.

- The signed-out guest profile endpoint returned `401 signed_out`. The guest
  portal showed Clerk sign-in. This confirms the denied state, but no
  authenticated guest or admin session was available for new lifecycle flows.
- The 2026 results page displayed its published category tiles. The matching
  results API succeeded for the 2026 edition and returned `403` when requested
  through the 2027 edition, whose results page correctly reported that results
  were unpublished.
- Public party-gallery APIs returned `published: false` and no photos for both
  2026 and 2027. The 2026 album page showed its waiting state.
- The 2027 contestant gallery showed its empty state while 2026 retained its
  own two existing smoke-test entries; the incomplete 2027 draft did not appear.
- The 2026 gallery search showed the Portuguese no-match message, restored
  results when cleared, and opened an accessible photo dialog. Keyboard checks
  confirmed focus stayed within the dialog, Escape closed it, and focus returned
  to the triggering photo.
- At 390px and 1440px widths, the homepage had no horizontal overflow; the
  contestant gallery also had no horizontal overflow at both widths. The
  mobile navigation disclosure opened and exposed its links.
- Axe reported zero violations on the settled homepage, 2026 results page,
  private party album, contestant gallery, and unpublished 2027 results page.
  The hamburger icon and homepage video produced manual-review/incomplete
  notices. The video is decorative and now hides under `prefers-reduced-motion`,
  leaving the static dark background. Runtime emulation confirmed the video
  changes to `display: none` for reduced motion and returns otherwise.
- The first settled contestant-gallery audit found insufficient contrast on
  the shared white-on-orange back link (2.37:1). Its text is now black; repeat
  audits of contestant photos and results reported zero violations.

The development database still contains the 2027 RSVP and incomplete draft
noted above, plus existing 2026 smoke-test contestant/results data. The browser
pass above performed no migration, index script, Cloudinary mutation, or
destructive database operation.
AI-08 cleanup and its deferred decisions are recorded in
[`legacy-code-audit.md`](legacy-code-audit.md); target-schema index behavior has
automated test coverage.

## Follow-up authenticated party-album QA — October 13, 2026

Using the saved development admin and RSVP guest session, the follow-up uploaded
two temporary copies of a local test image to the 2026 edition after its event
start. It did not change event schedules, contestant entries, ballots, or
results publication.

- While unpublished, the public album route showed its waiting state and no
  photos. The guest upload appeared in the admin album as private.
- Publishing the album made the first photo visible in the public gallery. A
  second upload made while published appeared automatically.
- Unpublishing returned the public route to its waiting state.
- The admin removed both temporary photos. Direct Cloudinary Admin API lookups
  returned `404` for both assets after removal, and no active matching test
  photo records remained. Removal tombstones and admin audit entries remain in
  development data.
- Without a signed-in session, the admin album API returned `401`; guest photo
  and profile APIs returned `401 signed_out`.
- Next.js `get_compilation_issues` returned no issues and `get_errors` showed no
  configuration or session errors during the follow-up.

## Isolated contestant and voting lifecycle QA — October 13, 2026

The #81 worktree used the development-only connection with the database name
overridden to `hf_qa_issue81_20261013_a`. That database was confirmed absent
before setup. One active 2026 fixture was created with an October 12 event start,
three isolated categories, and one RSVP linked to the signed-in development
guest. No production database, real edition schedule, or existing development
event data was changed.

- Created individual, junior, and group contestant entries through the guest
  portal. Uploaded one test photo to the individual entry with photo consent.
  Junior and group entries remain drafts without photos.
- Closed contestant entry in the admin dashboard. The interface confirmed the
  separate RSVP and contestant-entry controls, and the contestant-entry control
  remained closed.
- Started voting after entry closure. The dashboard locked category and entry
  changes, and showed the permanent cutoff state.
- After voting opened, a new RSVP API request returned `403` and a new
  contestant-entry request returned `409`. The linked guest profile returned
  the expected 2026 event, closed-entry, open-voting state.
- Candidate API calls returned `200` with zero candidates for all three
  categories. The only photo belongs to the current voter’s individual entry,
  which is excluded from their own ballot; the junior and group drafts lack
  completed, consented photos. The voting UI therefore had no candidate to
  select, and no ballot was submitted.
- Focused tests passed: 4 files, 62 tests across registration,
  contestant-entry, vote, and admin lifecycle routes. Next.js compilation
  diagnostics returned no issues; runtime diagnostics had no config or session
  errors.

The isolated database remains intact as QA evidence. Its single Cloudinary test
photo is still referenced by the isolated contestant record; it was not removed
because voting has permanently locked contestant changes in this fixture. No
other Cloudinary asset was changed by this run.

## Isolated full E05 lifecycle QA — October 14, 2026

The #81 worktree used the development-only environment with its database name
overridden to `hf_qa_issue81_20261014_b`. That database was confirmed absent
before setup. The isolated fixture contains one active 2026 edition, three
categories, and two RSVPs (one linked to the verified development guest). No
existing development edition or schedule was changed.

- Created complete individual, junior, and group entries and uploaded consented
  photos. An incomplete junior draft without a photo stayed out of the public
  gallery. The completed entries appeared in the gallery.
- Closed contestant entry, then confirmed an RSVP could still be created
  (`201`) while a late contestant entry was rejected (`409`). After starting
  voting, RSVP creation returned `403` and contestant entry returned `409`.
- The candidate API excluded the individual voter’s own entry and returned one
  eligible junior and group candidate. The guardian voted for the junior entry,
  and the group creator voted for their group. A repeated junior ballot was
  rejected (`409`), and the category appeared completed. Admin tallies showed
  the expected private counts.
- Before publication, public results APIs returned `403`; the admin results
  endpoint returned the expected unpublished tally. Publishing exposed the
  results. Reopening voting revoked public results and kept both ballots. A
  repeated vote remained rejected, and the ballot count and ID fingerprint
  matched before and after reopening.
- An authenticated admin photo correction after voting began returned `200`;
  the same request without credentials returned `401`.
- Guest party-photo uploads remained private before publication. Publishing
  exposed the album; an upload made while published appeared automatically.
  Unpublishing hid the album, and removing all three test photos removed them
  from Cloudinary. Direct Cloudinary checks confirmed all three assets were
  absent and no cleanup jobs remained. The public album API exposed only the
  intended photo fields.
- Next.js `get_compilation_issues` returned no issues and `get_errors` returned
  no configuration or session errors.

The isolated database remains intact as QA evidence. Its three contestant test
photos remain attached to fixture contestants. The party test photos were
deleted from Cloudinary; removal tombstones remain in the database. No pending
party-photo cleanup jobs remain.

## Remaining release gates

1. Repeat the tied-primary/runoff scenario with two verified guest identities
   submitting ballots through the browser. Current QA exercised one guest's
   primary and runoff ballots through the UI and seeded the other guest's two
   ballots in the isolated fixture.
2. Repeat cross-edition contestant, ballot, and result checks with signed-in
   accounts. Existing checks cover public 2026/2027 result and gallery isolation,
   plus the authenticated fresh 2027 RSVP and guest-profile access below.
3. After the 2027 event starts on October 12, 2027, verify its party upload,
   publication, post-publication upload, unpublish, individual removal,
   Cloudinary cleanup, and isolation. Its date was preserved and not backdated.

QA-01 and E05 remain open until the two-browser-voter and additional
cross-edition checks pass. The 2027 party-gallery scenario cannot be completed
before its scheduled event start.

## Isolated runoff and fresh RSVP rerun — October 14, 2026

The #81 worktree used a new isolated database, `hf_qa_issue81_20261014_c`.
The fixture was confirmed absent before indexes and synthetic records were
created. It used a synthetic 2026 event and future 2027 event; only the 2027
RSVP opening was set to the current test window. The 2027 event start stayed
October 12, 2027. The 2027 event was activated only in this isolated database.

- Two eligible frozen candidates produced a tied 1–1 primary tally. The
  authenticated guest submitted their primary and runoff ballots in the
  browser. The second RSVP's primary and runoff ballots were inserted directly
  into the isolated fixture in guarded transactions; no second verified Clerk
  identity was available for a browser-submitted ballot.
- Ending the tied primary created one runoff containing both candidates.
  Ending the tied runoff produced two tied co-winners and no third round.
  Public results stayed private before publication and after reopening voting.
  Reopening retained all four ballots, rejected a duplicate vote, and a
  subsequent end-and-publish restored the public tie result.
- Before the second synthetic RSVP was created, the signed-in 2026 guest's
  2027 guest-profile request returned `403 unlinked`. After the same verified
  account submitted a fresh 2027 RSVP through the public UI, its 2027 guest
  profile returned `200`; the profile request for its existing 2026 RSVP also
  returned `200`. This confirms the RSVP gate across editions, but does not
  cover cross-edition contestant, ballot, or result flows.
- The 2027 dashboard showed RSVP and contestant registration open while voting
  remained unavailable before the 2027 event start. The test preserved that
  future start date. Activating 2027 archived the synthetic 2026 edition in
  this isolated database; no existing development edition or schedule was
  changed.
- Next.js compilation diagnostics returned no issues. The isolated database
  remains intact as QA evidence.

The cross-edition RSVP gate and runoff lifecycle are now covered, with the
two-browser-voter gap and cross-edition contestant/ballot/results scenarios
still open. The 2027 party-gallery scenario remains gated on its scheduled
event start.
