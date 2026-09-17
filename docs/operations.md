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

The script stops before index creation when it finds duplicate event years,
registrations, or votes. Resolve the reported duplicates and rerun the script;
the completed earlier steps are safe to repeat. If an unexpected write or
partial failure cannot be reconciled, restore the backup before retrying.

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

After deployment, verify the public home page, registration state, admin sign-in
and dashboard authorization, manual voting controls, locked voting pages,
results visibility, and the photo gallery.
