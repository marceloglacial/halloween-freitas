# QA-01 Release QA report

**Status:** Incomplete. Automated checks pass and selected 2026 browser flows
passed against the confirmed development environment. The required full
two-edition walkthrough and remaining contest, voting, accessibility, and
responsive scenarios have not passed. E05 is not ready to close.

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
  gallery remained private and empty while 2026 data existed.
- The original 2026 edition was restored as active, with voting ended, results
  published, and the party album unpublished. The two temporary party photos
  were removed through the admin interface. Cloudinary-side deletion was not
  independently verified.

No migration or index script was run. AI-08 cleanup on local `main` remains
recorded in `docs/legacy-code-audit.md`; target-schema index definitions are
covered by `scripts/database-indexes.test.mjs`.

## Remaining release gates

The acceptance walkthrough in issue #81 is not complete:

1. Verify a fresh 2027 RSVP linked to the same Clerk account and prove a
   prior-year-only RSVP does not grant access to the new edition. Only the
   existing 2026 guest session and 2027 private empty state were checked.
2. Exercise individual, junior, and group entries, photo readiness, privacy,
   and frozen candidate behavior in the browser.
3. Exercise ballot submission/resumption, duplicate-tab behavior, runoff,
   round reopening, and persistence of the permanent RSVP and entry cutoffs.
4. Verify published and unpublished results across both editions and confirm
   no cross-edition leakage in guest, contest, vote, and result flows.
5. Complete the 2027 party gallery upload, publication, post-publication
   upload, unpublish, individual removal, Cloudinary cleanup, and edition
   isolation checks after the 2027 event begins on October 12, 2027. Its future
   event date was preserved; it was not backdated to bypass the upload rule.
6. Check mobile and desktop layouts, keyboard navigation and focus behavior,
   and Portuguese loading, empty, error, denied, and success states.

The 2026 gallery cleanup was verified through application responses and UI,
but the remote Cloudinary asset state was not independently queried. These
gates require follow-up before QA-01 or E05 can be closed.
