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

- Validate both scheduled starts, ordering, IANA timezones, malformed input,
  daylight-saving gaps, and the exact before/at/after behavior of each boundary.
- Verify `rsvpOpen` derives from registration start, active edition, and the
  permanent first-voting cutoff, independently of contestant-entry state.
- Exercise contestant entry open/close/reopen, freeze, incomplete drafts,
  consent/photo eligibility, and attempts to add/edit while closed.
- Verify voting cannot open before `eventStartsAt` or before eligible candidates
  are frozen; first opening atomically ends new RSVP and contestant membership
  changes.
- Verify closing/reopening a voting round preserves ballots and never removes
  the enrollment cutoff. Cover primary and runoff candidate selection, ties,
  zero-vote categories, and final results eligibility.

## Identity, authorization, and isolation tests

- Cover unregistered, unverified, mismatched, ambiguous, and already-linked
  guest identities, including concurrent RSVP claims.
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
- Cover category eligibility, individual self-vote rejection, guardian voting
  for a child, and creator voting for a couple/group entry.
- Race first voting opening against new RSVP and contestant requests; only
  operations ordered before the cutoff may succeed. Race close/reopen and ballot
  submission and assert no duplicate or lost ballot.
- Verify stable contestant IDs keep historical ballots attached through
  permitted admin corrections.

## Photo, publication, and cache tests

- Reject uploads before `eventStartsAt`, from users without an RSVP in the same
  edition, invalid files, oversize files, and rate-limit abuse.
- Verify multiple party uploads do not alter contestant photos/readiness and
  remain private until the album is published.
- Verify post-publication uploads appear by default, album unpublish revokes
  public API/rendered/cache access, and republish exposes only retained photos.
- Verify removals disappear immediately even when Cloudinary deletion fails;
  retry cleanup safely and never affect contestant assets.
- Verify results remain private until final voting ends and an administrator
  publishes; unpublish or reopening hides them from APIs, SSR, and caches.

## UI and operational checks

For UI changes, exercise mobile and desktop layouts plus loading, empty, error,
pending, denied, and published/private states. Check keyboard access and
Portuguese messages. For runtime-sensitive changes, follow the
[Next.js development loop](../.agents/skills/next-dev-loop/SKILL.md).

For application code changes, run `pnpm test`, `pnpm lint`, and `pnpm build`.
For documentation-only changes, check Markdown formatting and local links.
Never point a test at a production database or run a destructive database
operation as a substitute for an isolated fixture.
