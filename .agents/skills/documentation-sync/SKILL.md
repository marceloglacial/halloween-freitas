---
name: documentation-sync
description: Update Halloween Freitas product, architecture, lifecycle, data, testing, design, or contributor documentation when an approved contract or workflow changes. Use for documentation synchronization; routine refactors with unchanged behavior do not need it.
---

# Documentation sync

Keep each rule in its authoritative document. Use
[repository instructions](../../../AGENTS.md) and the [AI workflow](../../../docs/ai-workflow.md)
to route changes.

## Procedure

1. Identify whether the change alters an approved product behavior, lifecycle
   or ownership rule, API/data contract, design direction, operational step, or
   contributor workflow. A code reorganization with unchanged behavior does
   not by itself require contract edits.
2. Update the owning source: `docs/product.md` for user-visible scope;
   `docs/lifecycle.md` for transitions; `docs/architecture.md` for trust and
   system boundaries; `docs/data-model.md` for entities and constraints;
   `design.md` for the visual contract; `docs/operations.md` for environment,
   data, or deployment requirements; `AGENTS.md` for repository-wide
   instructions. Update linked supporting docs only when their guidance is
   affected.
3. Keep examples and terminology aligned with `GLOSSARY.md`. Do not copy a
   rule into multiple documents when a link to its source is sufficient.
4. Check changed Markdown formatting and relative links. Preserve managed
   generated sections in contributor files.

## Output checks

Report which contract changed and why, its authoritative source, supporting
links updated, and formatting/link-check results. State when no contract
documentation was needed and why.
