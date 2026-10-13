# QA-01 Release QA report

**Status:** Incomplete. Automated checks pass, selected authenticated 2026 flows
passed in the prior walkthrough, and the current public 2026/2027 routes and
responsive states were checked. Guest/admin lifecycle flows still need signed-in
test sessions. Cloudinary-side deletion and the 2027 party gallery remain
unverified; 2027 uploads must wait for the real event start. E05 is not ready to
close.

## Automated checks

| Check                | Result                    | Evidence                                                                                        |
| -------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm test`          | Pass: 69 files, 395 tests | Includes the new reduced-motion background-video regression test.                               |
| `pnpm lint`          | Pass                      | Completed in the dedicated #81 worktree.                                                        |
| `pnpm build`         | Pass                      | Next.js 16.4 production build and TypeScript completed with the development environment linked. |
| Markdown checks      | Pass                      | `pnpm check:docs`; formatting and local links passed.                                           |
| Next.js compilation  | Pass                      | `get_compilation_issues` returned no issues. Browser console showed no errors.                  |
| Next.js `get_errors` | Unavailable               | The MCP endpoint reported no connected browser session; runtime checks used `agent-browser`.    |

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
noted above, plus existing 2026 smoke-test contestant/results data. This
follow-up run performed no migration, index script, Cloudinary mutation, or
destructive database operation.
AI-08 cleanup and its deferred decisions are recorded in
[`legacy-code-audit.md`](legacy-code-audit.md); target-schema index behavior has
automated test coverage.

## Remaining release gates

1. With signed-in development guest and admin sessions, complete individual,
   junior, and group contestant entry flows with consented photos; verify
   readiness, private photo delivery, admin edit-only behavior, and permanent
   entry/RSVP cutoffs after voting first opens.
2. Exercise ballot submission and resumption, duplicate-tab behavior, runoff,
   round reopening, stable ballot IDs, and results publication/revocation. The
   current 2026 event has voting ended, so these transitions need an isolated
   test edition or approved fixture rather than changing its live schedule.
3. Repeat cross-edition guest, contestant, vote, and result checks with signed-in
   accounts. The public 2026/2027 result and gallery checks passed, as did the
   earlier fresh-RSVP isolation check.
4. Independently verify Cloudinary deletion for a known development test asset.
   Application responses confirmed removal, but there is no retained test asset
   identifier to compare remotely in this run.
5. After the 2027 event starts on October 12, 2027, verify its party upload,
   publication, post-publication upload, unpublish, individual removal,
   Cloudinary cleanup, and isolation. Its date was preserved and not backdated.

QA-01 and E05 remain open until the authenticated lifecycle checks and provider
cleanup check pass. The 2027 party-gallery scenario cannot be completed before
its scheduled event start.
