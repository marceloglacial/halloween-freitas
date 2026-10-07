---
name: halloween-backend
description: Build or change Halloween Freitas Next.js API handlers, server-side queries, request validation, authentication integration, and client response contracts. Use for application backend implementation; live database migration and index operations belong to the database operations skill.
---

# Halloween Backend

Resolve project paths from the repository root, three directories above this skill. Follow [AGENTS.md](../../../AGENTS.md); read the relevant installed Next.js guide under `node_modules/next/dist/docs/` before writing framework code. Consult the [architecture guide](../../../docs/architecture.md) for event ownership, authorization, and public data boundaries.

## Trace the server contract

Start with the affected `app/api/` handler, its colocated tests, the shared helper it calls, and its client consumers. Account for request fields, success shape, failure statuses, and serialization before changing the contract. Keep route-specific handling near the route; put broadly reused database and domain behavior in `lib/`.

- `lib/http.ts` provides JSON-object parsing, ID parsing, email/name normalization, and the shared error response. Reuse applicable helpers so malformed input follows the same response conventions as neighboring handlers.
- `lib/db.ts` manages the reusable MongoDB connection promise, including reset after connection failure. Use its client/database accessors rather than opening a separate connection for each request.
- `lib/env.ts` validates server configuration when needed. Inspect it and the operations guide before changing environment behavior; keep server credentials out of client modules and responses.
- Global declarations in `types/` describe client-facing entities. Inspect serializers alongside these types: `serializeUser` includes admin email data, while `toPublicUser` deliberately selects public fields. Serialize MongoDB IDs and dates before returning client data.

## Preserve trust and persistence boundaries

Use [halloween-event-workflows](../halloween-event-workflows/SKILL.md) when the change affects schedules, registration, voting, authorization, or results behavior. It guides domain tracing and regressions without requiring unrelated subsystems to be loaded.

At protected handlers, verify Clerk admin authorization before protected reads or writes. At guest voting handlers, resolve the verified Clerk session to its event registration through `lib/auth/voting-guest.ts`. Use `lib/auth/guest-registration.ts` for access independent of voting. Keep ownership claims in the authenticated POST access endpoint and preserve linked Clerk IDs during ordinary email edits. Treat a client-provided event or record ID as input to validate and scope, not proof of ownership. When a helper looks up a record by ID alone, ensure the caller verifies the record's owning event before using it in an event-scoped operation.

Construct explicit write fields from validated input rather than applying a request body wholesale. For uniqueness conflicts, handle the database's duplicate-key result as well as any pre-check; pre-checks alone cannot enforce concurrent uniqueness. Follow existing transaction boundaries for event creation and activation.

Keep expected failures as explicit HTTP statuses with Portuguese user-facing errors. Log unexpected details on the server and return generic failure text. If the API shape changes, update its affected consumers and types together.

For index, migration, or live database operations, read [halloween-database-operations](../halloween-database-operations/SKILL.md) and the operations guide. Implementing application code does not itself require executing a migration against the configured database.

## Verify behavior

Extend colocated helper or route tests for the behavior changed, including malformed input and relevant failure statuses. Follow existing Vitest dependency mocks to exercise handlers without a live database. For domain changes, use the event workflow's targeted security, privacy, ownership, and lifecycle scenarios rather than merely asserting calls to implementation helpers.

Use [next-dev-loop](../next-dev-loop/SKILL.md) for runtime verification of affected application behavior, following its tooling preflight. Run the code checks required by `AGENTS.md`. Update authoritative documentation when behavior or operational requirements change, and report validation plus any new API compatibility, index, environment, or deployment requirements.
