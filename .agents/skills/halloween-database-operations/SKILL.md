---
name: halloween-database-operations
description: Design or maintain MongoDB schemas, event-scoped indexes, and explicitly authorized database operations for the Halloween Freitas rebuild. Use for database operations, not ordinary application queries.
---

# Halloween Database Operations

Read [operations](../../../docs/operations.md), [architecture](../../../docs/architecture.md), and [data model](../../../docs/data-model.md) before changing database behavior. Follow [AGENTS.md](../../../AGENTS.md). These documents define the rebuild target; existing scripts and indexes describe legacy code only.

## Design for annual editions

- Use `eventId` as the canonical edition key for every RSVP, contestant, asset, round, ballot, result, and audit record.
- Derive unique constraints from the target data model. Include `eventId` in ownership and uniqueness checks so concurrent operations cannot cross editions.
- Use atomic conditional updates or transactions for enrollment cutoffs, active-edition changes, ballot uniqueness, publication, and multi-record corrections.
- Keep Cloudinary cleanup idempotent and retryable; failed external deletion must not restore a removed asset to public application data.

## Migration and live-operation boundaries

The rebuild has no historical data migration requirement. Do not adapt or run the legacy event migration against the new model. Annual operation creates or activates editions without resetting prior data.

Inspect command behavior, configuration loading, target database, transaction support, and backup status before any live write. Index creation, migration, reset, and cleanup commands are data operations. Require explicit user authorization and a confirmed target before running them; a skill invocation or failed check grants no authorization to mutate. Never print connection strings or credentials.

## Verification and reporting

Test index definitions, duplicate handling, atomic claims, event isolation, and retry behavior with isolated fixtures. Do not use a production database for tests. For live operations, report the exact target, prerequisites, command outcome, and any partial writes or manual action still needed. Follow the validation scope in `AGENTS.md` and the scenario matrix in [testing](../../../docs/testing.md).
