# Operations

This guide covers local setup, configuration, validation, migrations, and
deployment. For data flow and security rules, see the
[architecture guide](architecture.md).

## Prerequisites

- Node.js 22.13 or newer
- pnpm 12.4.2, as declared in `package.json`
- MongoDB with transaction support, such as a replica set or compatible hosted
  deployment
- Clerk and Cloudinary projects

Event creation and activation use MongoDB transactions. A standalone MongoDB
server that does not support transactions is insufficient for the full admin
workflow.

## Local development

Install dependencies and create the local environment file:

```bash
pnpm install
cp .env.example .env.local
openssl rand -base64 32
```

Put the generated value in `SESSION_SECRET`, configure the remaining variables,
then start the application:

```bash
pnpm dev
```

The development server is available at `http://localhost:3000`.

## Environment variables

| Variable                            | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                      | MongoDB connection string                                     |
| `DATABASE_NAME`                     | Database containing event collections                         |
| `SESSION_SECRET`                    | HMAC secret for guest voting sessions; at least 32 characters |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk application key                                  |
| `CLERK_SECRET_KEY`                  | Server-side Clerk key                                         |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud used for participant photos                  |

Store values in an ignored `.env.local` or `.env` file. Values prefixed with
`NEXT_PUBLIC_` are included in browser bundles and must not contain secrets.

## Administrator access

Clerk handles dashboard authentication. Grant administration access by setting
the Clerk user's public metadata to:

```json
{
  "role": "admin"
}
```

Being signed in without this metadata is not sufficient. The dashboard and
every `/api/admin/*` handler check the role independently.

## Cloudinary uploads

Set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` to the cloud that stores participant
images. The dashboard uploads through the unsigned preset
`halloween-freitas`; create that preset in the same Cloudinary project and
restrict its allowed formats, file sizes, and destination folder appropriately.

## Validation and production commands

Run the standard validation suite before submitting code changes:

```bash
pnpm test
pnpm lint
pnpm build
```

Use `pnpm check:indexes` to verify the configured database's required indexes
without changing data. The command exits unsuccessfully if an index is missing
or misconfigured.

Use `pnpm start` to serve a completed production build. Use `pnpm format` to
apply Prettier, including Tailwind class ordering, across the repository.

## Event data migration

`pnpm migrate:events` is for databases created before records were scoped to an
event. It writes records and creates indexes, so back up the target database
before running it. Confirm `DATABASE_URL` and `DATABASE_NAME` identify the
intended database, then run:

```bash
pnpm migrate:events
```

The idempotent migration:

- creates the archived 2025 event in the `America/Toronto` timezone;
- associates existing users, categories, and votes with that event;
- normalizes user emails and category metadata; and
- replaces voting and results timestamps with manual lifecycle state, keeping
  previously public results visible while leaving ongoing voting closed; and
- creates unique indexes for event years and slugs, the active event,
  registrations, and votes.

The seeded event uses a strictly ordered registration schedule. Lifecycle
backfilling is idempotent: existing manual values are preserved on reruns, while
obsolete voting and results timestamps are removed.

The script checks every event and stops before index creation when it finds
duplicate event years, slugs, active events, registrations, or votes. Resolve
the reported duplicates and rerun the script; the completed earlier steps are
safe to repeat. If an unexpected write or partial failure cannot be reconciled,
restore the backup before retrying.

## Deployment checklist

- Configure every variable from `.env.example` in the deployment environment.
- Use a MongoDB deployment that supports sessions, transactions, and the
  indexes created by the migration.
- Keep `SESSION_SECRET` stable across instances and deployments so active guest
  sessions remain verifiable.
- Configure the production URL and allowed origins in Clerk, and verify the
  Cloudinary `halloween-freitas` upload preset restrictions.
- Run `pnpm test`, `pnpm lint`, and `pnpm build` against the release revision.
- Run the event migration only when upgrading a pre-event database, and only
  after taking a verified backup.
- Run `pnpm check:indexes` against the production database after migrations and
  fail the deployment check if any required index is missing or misconfigured.

After deployment, verify the public home page, registration state, admin sign-in
and dashboard authorization, manual voting controls, locked voting pages,
results visibility, and the photo gallery.

## AI agent tooling

Next.js bundles version-matched documentation under
`node_modules/next/dist/docs/`. The managed block in `AGENTS.md` directs agents
there, and `CLAUDE.md` imports those same project instructions. Preserve the
managed block when editing contributor guidance.

### Installed workflow skills

The official skills are versioned in `.agents/skills`, alongside the project's
frontend, backend, event, and database skills:

- `next-dev-loop`: runtime verification through Next.js MCP and a real browser.
- `next-bundle-optimizer`: bundle auditing and requested optimization.
- `next-cache-components-adoption`: requested Cache Components migration.
- `next-cache-components-optimizer`: static-shell optimization after adoption.
- `next-partial-prefetching-adoption`: requested Partial Prefetching migration.
- `next-partial-prefetching-optimizer`: navigation optimization after adoption.

Source: [vercel/next.js skills at revision
fa8dcf34f1629dacc62f1952ee8a66a2439781a5](https://github.com/vercel/next.js/tree/fa8dcf34f1629dacc62f1952ee8a66a2439781a5/skills),
resolved from `canary`. Complete upstream skill directories are retained. Read
only the skill relevant to the task and follow its version and feature
prerequisites. Installation does not enable caching or prefetching features or
run any optimization workflow.

### Personal tooling setup

The runtime skill requires Next.js 16.3+ using Turbopack and a directly available
`agent-browser` CLI at version 0.31.1 or newer. This setup installs 0.38.2. To
reproduce it on another contributor's machine:

```bash
npm install -g agent-browser@0.38.2
agent-browser install
agent-browser --version
codex mcp add next-devtools -- npx -y next-devtools-mcp@latest
```

The MCP registration lives in the contributor's personal Codex configuration;
it is not installed by `pnpm install`. The repository's `.mcp.json` provides the
same server definition for clients supporting that file. Codex users should use
the personal registration rather than assuming `.mcp.json` is loaded. Preserve
other MCP entries, and start a new agent session after registration if the tools
are not yet available.

### Runtime verification

Start `pnpm dev`, or reuse the existing server URL and PID in `.next/dev/lock`.
Follow `next-dev-loop` for its worktree-scoped browser session, saved login
state, React DevTools, and MCP preflight. Read `agent-browser skills get core`
before driving the CLI. Routine verification can remain headless; a login that
requires user interaction uses the skill's headed flow.

The development-only `/_next/mcp` endpoint provides tool discovery, route
listing, compilation diagnostics, and runtime errors. Discover tools rather
than assuming names or signatures. Browser warnings and errors are forwarded to
the development terminal by Next.js's default `logging.browserToTerminal`
behavior; no additional logging configuration is needed.

If discovery fails, check the running server's actual port, Next.js version,
Turbopack availability, and the agent client's MCP configuration. If browser
preflight fails, check the CLI version and browser installation. Report missing
service credentials or database connectivity separately from tooling failures.
Runtime verification supplements `pnpm test`, `pnpm lint`, and `pnpm build`.
Preserve `.next` while a development server is running, and stop only servers
started for the current task. Close the scoped verification browser when done.

Automatic Next.js feedback remains disabled; this setup does not change
telemetry or enable feedback reporting.
