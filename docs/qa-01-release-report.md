# QA-01 Release QA report

**Status:** Incomplete. Automated checks pass and selected 2026 browser flows
and the annual RSVP isolation check passed against the confirmed development
environment. The remaining contest-photo, voting, accessibility, responsive,
and future 2027 gallery scenarios have not passed. E05 is not ready to close.

## Automated checks

| Check               | Result                    | Evidence                                                                                                     |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm test`         | Pass: 68 files, 394 tests | Route, domain, serialization, authorization, concurrency, publication, and UI render tests.                  |
| `pnpm lint`         | Pass                      | Completed in the #81 worktree.                                                                               |
| `pnpm build`        | Pass                      | Next.js 16.4 production build and TypeScript completed successfully with the development environment linked. |
| Next.js diagnostics | Pass                      | `get_errors` returned no config or session errors; `get_compilation_issues` returned no issues.              |

## Browser checks completed

The development-only `.env.local` was linked into this worktree. Using the
authenticated admin and guest sessions, the browser walkthrough verified the
following against the 2026 edition:

- A guest with a verified RSVP uploaded two party photos after event start
  while voting was open.
- Before publication, the public page showed the album as awaiting release and
  the public API returned no photos.
- Publishing exposed the photos. A photo uploaded after publication was also
  visible, and the public API response omitted uploader and Cloudinary identity
  fields.
- Removing each photo removed it from the public response. Unpublishing hid the
  album again.
- Reopening voting automatically hid published contest results; ending voting
  and republishing restored the public 2026 results page.
- A 2027 edition was created from the 2026 template, then archived. Its public
  gallery remained private and empty while 2026 data existed. An incomplete
  2027 contestant draft did not appear in the public contest gallery.
- A Clerk account linked to a 2026 RSVP was denied access to the 2027 guest
  portal before a 2027 RSVP existed. After confirming a new 2027 RSVP using
  that same verified account, it gained access to the 2027 guest portal. This
  verifies fresh RSVP gating and per-edition access for that account.
- The original 2026 edition was restored as active, with voting ended, results
  published, and the party album unpublished. The two temporary party photos
  were removed through the admin interface. Cloudinary-side deletion was not
  independently verified.

The 2027 RSVP and incomplete contestant draft remain as development test data.
The 2027 edition is archived and 2026 is active. The contestant-photo upload
walkthrough was interrupted when the browser target crashed after selecting a
test image; no successful photo upload was observed for that draft.

No migration or index script was run. AI-08 cleanup on local `main` remains
recorded in `docs/legacy-code-audit.md`; target-schema index definitions are
covered by `scripts/database-indexes.test.mjs`.

## Remaining release gates

The acceptance walkthrough in issue #81 is not complete:

1. Complete individual, junior, and group entry flows with consented photos;
   verify readiness, photo privacy, and frozen-candidate behavior in the
   browser. The individual draft flow created a private no-photo draft, but its
   image upload did not complete, and junior/group flows were not exercised.
2. Exercise ballot submission/resumption, duplicate-tab behavior, runoff,
   round reopening, and persistence of the permanent RSVP and entry cutoffs.
3. Verify published and unpublished results across both editions and confirm
   no cross-edition leakage in guest, contest, vote, and result flows.
4. Complete the 2027 party gallery upload, publication, post-publication
   upload, unpublish, individual removal, Cloudinary cleanup, and edition
   isolation checks after the 2027 event begins on October 12, 2027. Its future
   event date was preserved; it was not backdated to bypass the upload rule.
5. Check mobile and desktop layouts, keyboard navigation and focus behavior,
   and Portuguese loading, empty, error, denied, and success states.

The 2026 gallery cleanup was verified through application responses and UI,
but the remote Cloudinary asset state was not independently queried. These
gates require follow-up before QA-01 or E05 can be closed.
