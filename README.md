# Halloween dos Freitas

Event registration, voting, results, and photo gallery built with Next.js 16,
React 19, TypeScript, Tailwind CSS, Clerk, MongoDB, and Cloudinary.

## Local setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and fill in database, Clerk, Cloudinary,
   and session values. Generate `SESSION_SECRET` with `openssl rand -base64 32`.
3. Start the app with `pnpm dev` and open `http://localhost:3000`.

Run `pnpm lint`, `pnpm test`, and `pnpm build` before submitting changes.

## Event data migration

Back up the database, configure `DATABASE_URL` and `DATABASE_NAME` in
`.env.local` (or `.env`), then run:

```bash
pnpm migrate:events
```

The idempotent migration creates the archived 2025 event in the
`America/Toronto` timezone, associates existing users, categories, and votes,
and creates uniqueness indexes. It stops without creating indexes when
duplicate emails or votes require manual resolution.

Future events are documents in the `events` collection, with one event per
year. Admins can create a year, copy the previous year's categories, edit its
schedule, and explicitly activate it from `/dashboard`. Activating a year
archives the previously active event. All schedule fields are stored as BSON
dates, while `timezone` is an IANA name.

## Access boundaries

- Clerk users with `publicMetadata.role: "admin"` can access the dashboard and
  `/api/admin/*` routes.
- Guests enter their registered email to receive a signed, HTTP-only voting
  session. Voting APIs never trust a client-provided voter ID.
- Photos and published results are public. Email addresses are returned only
  by authenticated admin endpoints.
