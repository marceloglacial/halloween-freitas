# Operations

This guide covers local setup, environment configuration, validation, and
release boundaries for the clean rebuild. See [architecture](architecture.md)
for trust and ownership rules and [AI workflow](ai-workflow.md) for issue and
review practices.

## Prerequisites and local development

Use the Node.js version declared in `package.json` and the repository's pnpm
version from `package.json`. Install dependencies and create a local environment
file from the example:

```bash
pnpm install
cp .env.example .env.local
```

Configure credentials, then run `pnpm dev` and open `http://localhost:3000`.
Use a non-production MongoDB database for development and tests. Do not print
credentials or connection strings in logs, command output, or issue comments.

## Environment and secrets

The checked-in `.env.example` names the current connection and provider settings:

| Variable                            | Purpose                            |
| ----------------------------------- | ---------------------------------- |
| `DATABASE_URL`                      | MongoDB connection string          |
| `DATABASE_NAME`                     | Target database name               |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk frontend key          |
| `CLERK_SECRET_KEY`                  | Server-only Clerk key              |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public Cloudinary cloud identifier |

Keep server credentials in ignored local files or the deployment secret store.
Any Cloudinary signing or upload credentials must remain server-only. Confirm
the implemented environment schema before adding or changing variable names;
do not expose secrets through `NEXT_PUBLIC_` variables.

## Database lifecycle

The application and database are being rebuilt cleanly; no historical data
migration is required. Do not adapt or run a legacy event migration against the
new schema. The obsolete `migrate:events` command and script have been removed.
A destructive reset is permitted only as an explicitly approved rebuild step
with the database target confirmed. Annual operation creates or activates a new
edition while retaining prior editions; it never resets the database.

The package still contains `check:indexes` and `create:indexes` scripts for the
pre-rebuild schema. They do not cover the target data model's round-scoped
ballot key or new entities; do not run them against the rebuild database.
Replace them with target-schema tooling before any future index operation.

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

Do not commit, push, merge, or deploy automatically. Each release action needs
the user's explicit authorization.

## AI agent tooling

For issue-driven AI work, install the repository dependencies with `pnpm
install` and use Git with worktree support. Issue selection and ticket updates
require an authenticated GitHub CLI session (`gh auth status`). Project skill
routing and optional reviewer agents require the Codex CLI, a trusted
repository, and the local `.agents/skills/` and `.codex/agents/` files.
Check CLI support with `codex --version` and `codex debug prompt-input` before
depending on custom agents. Custom agents are optional; the primary Codex
session must be able to continue when they are unavailable.

Documentation-only harness work needs no application secrets, database, or
running web server. For application changes, use the relevant application
prerequisites and validation below. See the [AI harness validation
record](ai-harness-validation.md) for a smoke-test example and its limits.

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
