# Operations

This guide covers local setup, environment configuration, validation, and
release boundaries for the clean rebuild. See [architecture](architecture.md)
for trust and ownership rules and [AI workflow](ai-workflow.md) for issue and
review practices.

## Prerequisites and local development

Use the Node.js version declared in `package.json` and the repository's pnpm
version from `package.json`. Install dependencies and create the local
development environment file in the main worktree from the example:

```bash
pnpm install
cp -n .env.example .env.local
```

Configure development credentials, then run `pnpm dev` and open
`http://localhost:3000`. Use a non-production MongoDB database for development
and tests. Keep production credentials outside the development agent's
filesystem and credential context. Do not print, log, copy into tracked files,
commit, or expose environment values in agent responses, command output, or
issue comments.

## Environment and secrets

The checked-in `.env.example` names the current connection and provider settings:

| Variable                            | Purpose                            |
| ----------------------------------- | ---------------------------------- |
| `DATABASE_URL`                      | MongoDB connection string          |
| `DATABASE_NAME`                     | Target database name               |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk frontend key          |
| `CLERK_SECRET_KEY`                  | Server-only Clerk key              |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY`                | Server-only Cloudinary API key     |
| `CLOUDINARY_API_SECRET`             | Server-only Cloudinary API secret  |

Keep server credentials in ignored local files or the deployment secret store.
Contest-photo and party-photo uploads require the server-only Cloudinary API
key and secret; the server signs uploads and stores both asset types with
authenticated delivery in separate event-scoped folders. Never move these
values to `NEXT_PUBLIC_` variables or reuse contest-photo storage for the party
album.

### Request rate limits

Public RSVP and guest-link requests use short-lived, event-scoped MongoDB
counters. The application uses the existing server-only Clerk secret to HMAC
limiter identities; it does not store raw email addresses, Clerk IDs, or client
addresses in rate-limit records. A TTL index removes expired buckets.

The fixed windows allow 60 RSVP attempts per client address every 15 minutes,
5 per normalized email every hour, 30 guest-link attempts per client address
every 15 minutes, and party-photo uploads at 30 per client address and 10 per
linked RSVP every 15 minutes. Limited requests receive a generic `429` response
with `Retry-After`; RSVP and guest-link limits do not reveal whether an RSVP or
account exists. Limiter identities are HMACed and event-scoped.

In production, configure the trusted reverse proxy to overwrite `x-real-ip`
with the connecting client address. The application accepts only a valid
`x-real-ip` value and fails closed with `503` when it is missing or invalid; it
does not trust client-supplied `x-forwarded-for`. Local development uses one
shared development bucket when no address header is present. Never forward an
untrusted client value as `x-real-ip`.

Party-photo cleanup removes authenticated Cloudinary assets sequentially, with
at least 250 ms between deletion requests and batches of up to ten assets.
Bulk guest deletion drains due cleanup jobs through those throttled batches.
Failed Cloudinary deletions remain event-scoped in the retry queue and use
exponential backoff.

### Issue worktrees

Keep local development credentials at the canonical checkout's `.env.local`;
this is the only local environment entry currently used by the project. It
must resolve to a regular file containing development-only credentials for a
non-production database. Never inspect or print its values to establish that
status; use the owner-configured development environment described above. If
its status is unknown, leave it unlinked and stop before application work.

From a dedicated issue worktree, run `node scripts/link-issue-env.mjs`. The
helper resolves the canonical checkout from Git's worktree list, so checkout
paths do not depend on a fixed parent directory. It creates an absolute
`.env.local` symlink only after verifying that the source resolves to a regular
file, the source entry and any in-checkout target are untracked, and both are
ignored by Git. It leaves an already-correct symlink in place and stops without
changing any conflicting target. A missing source or unsafe Git state is an
actionable setup error; configure the development environment in the canonical
checkout and rerun the helper. The `.env*` ignore rule keeps
both the source and worktree symlink out of commits. Never copy credentials or
add the helper's allowlisted environment files to Git.

After an issue's checks pass, start the actual package `dev` script from its
worktree and keep that process running for review. Use the package manager and
script declared in `package.json`; let the server report its actual port. If a
port is occupied, use an available port without stopping the existing
listener. Confirm the reported URL responds before handing it to the user.
Keep the worktree's `.next` output in place while the server runs.

After approval, finalization stops only the dev server started for that issue,
then removes the issue worktree normally. Removing the worktree removes its
symlink and generated files; it preserves the canonical `.env.local`. Never
delete or modify that source during worktree cleanup.

## Database lifecycle

The application and database are being rebuilt cleanly; no historical data
migration is required. Do not adapt or run a legacy event migration against the
new schema. The obsolete `migrate:events` command and script have been removed.
A destructive reset is permitted only as an explicitly approved rebuild step
with the database target confirmed. Annual operation creates or activates a new
edition while retaining prior editions; it never resets the database.

The `check:indexes` and `create:indexes` scripts verify and create declared
indexes, including unique event year and slug, a partial unique active-edition
index, event-scoped category ordering, unique party albums, guest party-photo
and cleanup lookups, unique per-edition individual/group contestant ownership,
unique voting-round types per edition, one open round per edition, and unique
ballots per event/round/category/RSVP. They are idempotent
and check for known duplicates before index creation, but they do not reset,
seed, or migrate documents. Review the index definitions and verify the target
database before any authorized index operation; never use them on a legacy
database.

Database schema, indexes, and transaction prerequisites are defined alongside
the implementation contract in [architecture](architecture.md) and
[data model](data-model.md). Verify the target and a recoverable backup before
any authorized live database mutation. Running an index or migration command
against a connected database is a data operation, not routine validation.

## Validation

For application code changes, run:

```bash
pnpm test
pnpm lint
pnpm build
```

For documentation-only changes, check Markdown formatting and local links.
Run `pnpm check:docs` to apply both checks.
Use an isolated database or test fixture for mutating integration tests. Never
point tests at production or run destructive operations as a validation shortcut.

## Deployment and release

Configure the required Clerk, MongoDB, and Cloudinary services using the
environment schema implemented by the release. Keep credentials server-side,
confirm production points at the intended database, and verify privacy,
edition isolation, lifecycle transitions, and publication revocation before
release. Record environment, index, migration, and external-service changes in
the release notes.

Issue implementation changes remain uncommitted for review. After approval of
the reviewed change set, the harness performs the issue-referenced local
commit, local `main` merge, and validation. It then closes the exact linked
GitHub issue as completed with `scripts/close-merged-issue.mjs` and its
explicit `--approved` flag, verifies the result, stops that issue's server,
and removes its clean worktree and merged
local branch as documented in the [AI workflow](ai-workflow.md). The close
helper requires the associated issue branch to be merged into local `main`
and both worktrees to be clean; GitHub failure stops cleanup. This workflow
does not fetch, push, create a PR, close an epic, or deploy. Push requires a
separate explicit request naming the branch and remote. Epic closure requires
separate explicit approval. Deployment always requires its own explicit
authorization.

## AI agent tooling

For issue-driven AI work, install the repository dependencies with `pnpm
install` and use Git with worktree support. Issue selection refreshes current
GitHub data through the CLI; public issues may be read anonymously, while
private issue reads and GitHub mutations require an authenticated session
(`gh auth status`). Project skill routing and optional reviewer agents require
the Codex CLI, a trusted
repository, and the local `.agents/skills/` and `.codex/agents/` files.
Check CLI support with `codex --version` and `codex debug prompt-input` before
depending on custom agents. Custom agents are optional; the primary Codex
session must be able to continue when they are unavailable.

Documentation-only edits and checks do not read application credentials or
connect to the database. The issue handoff nevertheless starts the dev server
for manual review, so worktree setup requires the development-only `.env.local`
described above. If it is unavailable, report the setup error and do not claim
that a local review server is ready. For application changes, use the relevant
application prerequisites and validation below. See the [AI harness
validation record](ai-harness-validation.md) for workflow smoke tests and
their limits.

Next.js bundles version-matched documentation under
`node_modules/next/dist/docs/`. The managed block in `AGENTS.md` directs agents
there, and `CLAUDE.md` imports the same project instructions. Preserve the
managed block when editing contributor guidance.

The installed Next.js skills under `.agents/skills/` include runtime
verification, bundle auditing, Cache Components, and Partial Prefetching
workflows. Read only the relevant skill and its prerequisites; installation
does not enable a Next.js feature or start an optimization workflow.

For runtime checks, read `.agents/skills/next-dev-loop/SKILL.md`. Reuse an
existing development server when available and follow the skill's browser and
MCP preflight. Runtime verification supplements the code checks; it does not
replace tests, lint, or build.
