# QA-01 Release QA report

**Status:** Automated checks pass. A local Next.js server starts, but runtime
browser checks are blocked because Clerk has no publishable key in this
worktree. The full E2E walkthrough also needs a confirmed development-only
environment with test accounts and event data.

## Automated checks

| Check        | Result                    | Evidence                                                                                                                                                                  |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`  | Pass: 68 files, 394 tests | Route, domain, serialization, authorization, concurrency, publication, and UI render tests.                                                                               |
| `pnpm lint`  | Pass                      | Current `main` snapshot in the #81 worktree.                                                                                                                              |
| `pnpm build` | Pass                      | Next.js 16.4 production build completed without `.env.local`.                                                                                                             |
| Dev runtime  | Blocked                   | Server starts on port 3000; `/`, `/resultados`, and `/album-da-festa` return a 500 because `@clerk/nextjs` has no publishable key. Next.js reports no compilation issues. |

## Covered behavior

- **RSVP and guest access:** `app/api/registrations/route.test.ts`,
  `app/api/guest-access/route.test.ts`, and
  `app/api/guest-session/route.test.ts` cover cutoff behavior, rate limits,
  identity linking, and private responses.
- **Contest entries and photos:** contestant entry and photo tests cover
  individual, junior, and group ownership; consent/readiness; edition checks;
  enrollment cutoff; and safe photo replacement/cleanup behavior.
- **Voting and lifecycle:** vote and admin lifecycle route tests cover verified
  voters, frozen candidates, round isolation, concurrent close/submission,
  runoff, enrollment cutoff, reopening, and audited publication transitions.
- **Results and party photos:** result page/API and gallery route tests cover
  publication privacy, edition isolation, event-start upload timing, rate
  limits, private asset responses, album publication, removal, and cleanup.
- **AI-08 cleanup:** local `main` includes merge `3708a6d`. The removed starter
  assets and event migration are recorded in `docs/legacy-code-audit.md`. The
  target-schema index definitions were updated later by #82 and are covered by
  `scripts/database-indexes.test.mjs`; no live database index operation was run.

These tests use fixtures and mocks. They verify route and domain behavior, but
do not demonstrate the full guest/admin journeys in a browser or against Clerk,
MongoDB, or Cloudinary services.

## Runtime walkthrough still required

Run against a confirmed non-production development environment with two
isolated annual editions. Do not run migration or index scripts as part of the
walkthrough.

1. Create an RSVP in the selected edition, link a Clerk account, and verify that
   an account with only a prior-year RSVP cannot access the new edition.
2. Add individual, junior, and group entries with photos. Verify draft privacy,
   readiness, and frozen candidate state after the first voting opening.
3. Open and close voting, submit and resume ballots, race a duplicate tab,
   trigger a runoff, reopen the current round, and verify ballots and the
   permanent RSVP/contest-entry cutoff remain intact.
4. Publish results, browse the selected and historic published editions,
   unpublish and confirm public pages/APIs hide results, then republish.
5. Upload multiple party photos after event start while voting is open. Verify
   private access before publication, automatic visibility after publication,
   revocation on unpublish, individual removal, and safe Cloudinary cleanup.
6. Repeat the public and guest checks across both editions. Check mobile and
   desktop layouts, keyboard navigation, focus handling, and Portuguese
   loading, empty, error, denied, and success states.

The #81 worktree has no `.env.local` link because the main worktree's existing
file has not been confirmed as development-only. The local dev server was
started without environment credentials. No database, Clerk account, or
Cloudinary operation was used. The runtime walkthrough remains pending until a
development-only environment with test accounts and event data is available.
