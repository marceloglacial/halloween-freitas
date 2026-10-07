---
name: halloween-database-operations
description: Verify Halloween Freitas MongoDB indexes, maintain its event migration, or carry out an authorized legacy event-data migration. Use for database operations and their deployment prerequisites, not ordinary application queries or UI changes.
---

# Halloween Database Operations

Read the [operations guide](../../../docs/operations.md) before database or environment work. For ownership or uniqueness changes, also read the [architecture guide](../../../docs/architecture.md). These documents are authoritative; resolve code paths below from the repository root, three directories above this skill.

## Choose the operation

- **Verify indexes:** inspect `scripts/check-database-indexes.mjs` and the expected definitions in `scripts/database-indexes.mjs`. `pnpm check:indexes` reads the configured database and returns a failing status for missing or misconfigured indexes. A failed check is evidence to report, not authorization to repair the database.
- **Maintain migration code:** inspect `scripts/migrate-events.mjs`, shared index definitions, and their tests. Follow the migration's actual write order and idempotency behavior before changing it. Keep operational consequences documented in the operations guide.
- **Run a legacy migration:** `pnpm migrate:events` writes records and indexes. Use it for the documented pre-event upgrade when the user's task authorizes that database mutation; loading this skill alone grants no authorization.

## Establish the target and prerequisites

Confirm which environment and database the requested operation targets without printing connection strings or secret values. Inspect the scripts' environment loading and `lib/env.ts` when configuration behavior matters; avoid assuming that a shell variable or environment file wins without checking.

Before a migration, establish the intended target and a verified backup as required by the operations guide. If authorization, target, or backup is missing, finish available read-only preparation and request the missing prerequisite before writing. Verify transaction support when preparing the full admin event workflow; a standalone MongoDB instance is insufficient for event creation and activation.

## Handle results and failures

For index verification, report the exit status and each missing or misconfigured index. For a completed migration, run the read-only index check and report both outcomes.

On migration failure, inspect the error and which writes may already have completed. Follow the operations guide's duplicate-resolution and partial-failure guidance: rerun only after the reported problem is resolved and completed steps are understood to be safe to repeat. If an unexpected write or partial failure cannot be reconciled, stop and use the documented backup-restoration path within the user's authorization. Bound retries by a resolved cause rather than repeating the same failing mutation.

For code changes, test index definitions and migration behavior relevant to the change, including idempotency and duplicate handling where affected. Use fixtures or an isolated test database for mutating verification; distinguish those checks from execution against the user's configured database. Run the checks required by `AGENTS.md` and report any migration, index, environment, or deployment requirements introduced by the change.
