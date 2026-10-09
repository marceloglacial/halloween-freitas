# Legacy code audit

This audit records the repository state for GitHub issue #85 (AI-07) on
2026-10-09. It is an inventory and cleanup plan only; no application code,
dependencies, database data, Cloudinary assets, or branches were removed or
changed.

## Repository state reviewed

- Source snapshot: clean `main` at merge `499239b` before this audit, in the
  dedicated worktree `issue-85-ai-07-audit-legacy-code-and-protect-in-progress-rebuild`.
- Other local worktrees at audit start were clean: issues #45 (`5145aa7`), #46
  (`9311586`), and #47 (`71df033`). No uncommitted work was found to inherit or
  overwrite. Their branches are historical review branches; `main` contains
  the integrated changes.
- Open implementation work remains in GitHub, including MVP event, RSVP,
  contestant, voting, and photo issues. The current code must be treated as
  required until each replacement is implemented and tested.
- No live MongoDB or Cloudinary account was queried. This audit cannot identify
  deployed collections, retained records, uploads, or external references.

## Current inventory

### Routes and features

The App Router entry points are under `app/`. Current public experiences are
the homepage (`app/page.tsx`), Clerk access (`app/acesso/`), voting
(`app/votacao/`), results (`app/resultados/`), contestant-photo browsing
(`app/fotos/`), and administration (`app/dashboard/`). API routes under
`app/api/` cover registration, guest linking, event/category/candidate reads,
votes, results, admin users, and event CRUD/lifecycle. `proxy.ts` installs Clerk
middleware.

These routes are actively used by the current application. Their presence does
not establish that they meet the newer product contract. In particular,
`app/fotos/` displays contestant images, not the separate guest-uploaded party
album. The current admin user APIs and `lib/users.ts` combine RSVP details,
contestant flags, and contestant image fields in MongoDB's `users` collection.

### Persistence and feature gaps

Application collection calls identify `events`, `users`, `categories`, and
`votes`. The current records and handlers are used by the existing experience,
but differ from the target documented in [product](product.md),
[architecture](architecture.md), and [data model](data-model.md):

| Target domain or rule                 | Current source evidence                                                                                                                                                                                                                              | Audit classification                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Annual editions                       | `lib/events.ts`, `types/event.d.ts`, and admin event routes use `events`; the current schedule has `startsAt`, `registrationOpensAt`, and `registrationClosesAt`. The target uses distinct registration/event starts and a first-voting-open cutoff. | Actively used; preserve until the event lifecycle replacement is complete.                         |
| RSVP and guest identity               | `app/api/registrations/route.ts`, `lib/users.ts`, and `lib/auth/guest-registration.ts` store RSVP and link state in `users`.                                                                                                                         | Actively used; do not remove while guest/RSVP replacements are pending.                            |
| Contestant ownership and entry states | Current `User` has `group`, `junior`, and `imageUrl` fields (`types/user.d.ts`); no separate contestant-entry API or collection is present.                                                                                                          | Replacement is incomplete; preserve existing flows until contestant issues replace them.           |
| Voting                                | `app/api/votes/route.ts`, `lib/voting.ts`, and `lib/results.ts` use `votes` and current candidate IDs. The target requires round-scoped stable ballots and a runoff.                                                                                 | Actively used but target behavior is incomplete; defer removal/rewrite until voting issues finish. |
| Results                               | `app/api/results/` and `app/resultados/` gate results using event state.                                                                                                                                                                             | Actively used; preserve until publication and results replacements pass QA.                        |
| Party photo album                     | No party-photo or album collection, upload API, or album publication route was found. `app/fotos/` is the contestant gallery.                                                                                                                        | Missing target feature; do not treat contestant-photo code as an obsolete duplicate.               |
| Admin audit history                   | No audit collection or general admin action log was found.                                                                                                                                                                                           | Target capability is missing; do not delete neighboring admin handlers as cleanup.                 |

`lib/auth/admin.ts` checks Clerk `publicMetadata.role === "admin"` and is used
by admin routes. Clerk, MongoDB, and Cloudinary are real application
integrations, not cleanup candidates: `lib/db.ts`, `lib/auth/`, `next.config.ts`,
and the current image components use them. The current Cloudinary upload button
uses the `halloween-freitas` preset in `components/dashboard/user-edit-modal.tsx`;
server-signed party uploads and private album delivery are not implemented.

### Dependencies, scripts, configuration, and assets

`package.json` retains the active Next.js/React, Clerk, MongoDB, date/timezone,
Cloudinary image, gesture, Tailwind, toast, and test/lint/build tooling. Source
imports were found for `date-fns-tz`, `next-cloudinary`, `@use-gesture/react`,
and `sonner`. No direct source import of `date-fns` was found, but the lockfile
declares it as a peer for `date-fns-tz`; it must remain a direct dependency.

The package still exposes `migrate:events`, `check:indexes`, and
`create:indexes`. `docs/operations.md` already marks these database scripts as
legacy and unsafe for the rebuilt schema. `scripts/migrate-events.mjs` seeds a
2025 event, assigns unscoped records, normalizes emails, changes lifecycle
fields, and creates indexes; it is a data-mutating migration and must not be
run as validation. `scripts/database-indexes.mjs` defines indexes for the
current four collections, including the old vote uniqueness key, which differs
from the target round-scoped ballot key. The scripts and their tests are
candidates for retirement only after the correct target-schema index and
operational tooling exists and no supported environment relies on them.

Repository assets are `public/hero-video.mp4`, `public/open-graph.jpg`,
`public/next.svg`, and `public/vercel.svg`. The hero video and Open Graph image
are referenced by the UI/layout and are covered by the homepage visual
contract. No source reference to `next.svg` or `vercel.svg` was found; they are
low-risk source-tree cleanup candidates after a full generated/config reference
check. Contest photos reside in Cloudinary rather than the repository. Their
inventory and retention state are unknown; this audit makes no asset-deletion
recommendation.

## Classification and preservation list

| Classification                             | Paths or areas                                                                                                                                                               | Rationale and cleanup condition                                                                                                                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preserve                                   | `design.md`, `public/hero-video.mp4`, `public/open-graph.jpg`, homepage components in `components/home/`, `app/page.tsx`                                                     | The approved homepage section layout, hero/video, and visual identity remain binding. Keep unchanged during AI-08 cleanup.                                                                                                                       |
| Preserve                                   | `.env.example`, `lib/auth/`, `lib/db.ts`, `next.config.ts`, current Cloudinary image components                                                                              | These configure or implement required Clerk, MongoDB, and Cloudinary integrations. Reconcile with replacement features before any change; never expose credentials.                                                                              |
| Actively used by rebuild                   | Current `app/`, `components/`, `hooks/`, `lib/`, `util/`, and `types/` feature flows                                                                                         | They serve current routes and users. Several have legacy data shapes, but removal must wait for completed and tested replacements.                                                                                                               |
| Actively used by rebuild                   | `docs/product.md`, `docs/lifecycle.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/testing.md`, `docs/operations.md`, `AGENTS.md`, `.agents/skills/`                | These express approved product, safety, and contributor contracts. Source/contract mismatches are implementation work, not stale documentation by default.                                                                                       |
| Preserve                                   | Direct `date-fns` dependency                                                                                                                                                 | Although there is no direct source import, the lockfile records it as a peer dependency of `date-fns-tz`.                                                                                                                                        |
| Candidate for later removal                | `public/next.svg`, `public/vercel.svg`                                                                                                                                       | No source references found; confirm generated metadata and deployment references before removal.                                                                                                                                                 |
| Candidate for later removal                | `scripts/migrate-events.mjs` and `migrate:events`                                                                                                                            | Explicitly obsolete for the clean rebuild and mutates data. Remove only after confirming no supported recovery/runbook still depends on it; never execute it against rebuild data.                                                               |
| Candidate for later removal or replacement | `scripts/database-indexes.mjs`, `scripts/check-database-indexes.mjs`, `scripts/create-database-indexes.mjs`, `scripts/database-indexes.test.mjs`, and their package commands | Current index contract does not match target round-scoped ballots and omits target entities. Retire only with an implemented, reviewed replacement and updated operations guidance. Do not run these against a live database as part of cleanup. |
| Uncertain / owner review                   | Cloudinary account assets, MongoDB records/indexes, external deployment variables, unsigned upload preset                                                                    | Not visible from repository source. Requires owner-approved inventory and a confirmed target; this audit does not query or mutate provider data.                                                                                                 |
| Defer until replacements ship              | RSVP/user and candidate image fields, current vote/result handlers, contestant gallery, dashboard user controls                                                              | They overlap future MVP features but currently support the existing application. Recheck usages and acceptance tests when AI-08 reaches each item.                                                                                               |

## Safe cleanup order for AI-08

1. Use this inventory as a candidate checklist, then re-scan each proposed path
   and dependency at removal time, including imports, route consumers, scripts,
   tests, package metadata, and deployment references.
2. Defer any route, component, collection field, or provider configuration
   still needed by an open MVP issue. Remove or replace feature code only after
   its replacement is implemented and tested against the approved contracts.
3. Replace database operational scripts with target-schema-safe tooling before
   retiring index support. Do not run migrations, reset MongoDB, delete records,
   remove indexes, or bulk-delete Cloudinary assets during source cleanup.
4. Preserve the homepage and `design.md`. For each cleanup change, run the
   relevant tests, lint, build, and QA from AI-08; update operational and product
   documentation only when its contract has actually changed.
5. Record removed files/dependencies, deferred items, validation, and unresolved
   owner decisions in the AI-08 handoff.

## Audit limits

The audit used repository source, configuration, and the local GitHub issue and
worktree state. It did not run the application or connect to external services.
It cannot establish whether an unused-looking asset is referenced by a
deployment, whether database records exist, or whether Cloudinary assets are
still required. Those remain explicit owner/provider checks before cleanup.

## AI-08 cleanup outcome

The AI-08 follow-up removed `public/next.svg`, `public/vercel.svg`, and the
obsolete `migrate:events` command and `scripts/migrate-events.mjs`. Repository
references were checked before removal. The current `check:indexes` and
`create:indexes` scripts remain deferred because the target-schema replacement
is not implemented. `date-fns` remains installed because `date-fns-tz` declares
it as a peer dependency. Application routes, homepage assets, database records,
and Cloudinary assets were not removed or changed.
