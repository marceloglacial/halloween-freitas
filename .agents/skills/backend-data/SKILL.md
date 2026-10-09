---
name: backend-data
description: Change Halloween Freitas API handlers, server queries, request validation, authentication integration, persistence access, and response contracts. Use for server-side implementation; live schema, index, or migration operations belong to halloween-database-operations.
---

# Backend data

Keep database access, identity resolution, authorization, lifecycle decisions,
and response shaping on the server. Treat the [product](../../../docs/product.md),
[architecture](../../../docs/architecture.md), and [data model](../../../docs/data-model.md)
as target contracts. Read [repository instructions](../../../AGENTS.md) and the
matching installed Next.js guide before changing framework code.

## Procedure

1. Trace the affected route handler, colocated tests, shared helpers, response
   serializer, and client consumer. Record request fields, success shape, and
   expected failure statuses before changing a contract.
2. Normalize and validate untrusted input through shared helpers. Construct
   explicit write fields; never apply a request body wholesale.
3. Enforce Clerk authorization and derive guest identity from the verified
   session and same-edition RSVP link. Treat client IDs as lookup input, never
   proof of ownership.
4. Scope every guest, contestant, category, asset, vote, and result operation
   to `eventId`. Serialize MongoDB IDs and dates explicitly; omit email, Clerk
   IDs, private drafts, unpublished votes, and private asset identifiers from
   public responses.
5. Use atomic writes and database uniqueness for ownership claims, enrollment
   cutoffs, and duplicate-sensitive operations. Application prechecks alone do
   not protect concurrent requests.

## Output checks

- Cover malformed input, expected failure statuses, authorization, privacy,
  concurrency, and cross-edition isolation where the changed path requires
  them.
- Update affected consumers and types with response-contract changes.
- Run repository-required code checks and report validation, plus any new
  compatibility, environment, index, or deployment requirements.

For schema/index design or live database work, read
[halloween-database-operations](../halloween-database-operations/SKILL.md) and
`docs/operations.md`. Live mutations require separate explicit authorization.
