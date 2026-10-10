---
name: frontend-design
description: Build or change Halloween Freitas pages, React components, client hooks, responsive layouts, forms, and photo interfaces. Use for frontend implementation and design alignment; API-only changes belong to backend-data.
---

# Frontend design

Treat [`design.md`](../../../design.md) as the binding visual reference,
including the established homepage layout. Read the relevant product and
lifecycle contracts before rendering domain state. Follow [repository
instructions](../../../AGENTS.md), and read the matching installed Next.js
guide before writing framework code.

## Procedure

1. Trace the route, layout, loading/error boundaries, feature components, client
   hooks, server-provided data, and API consumers affected by the change.
2. Preserve server ownership of database access, identity, authorization, and
   public data shaping. Add client boundaries only for browser interaction.
3. Match typography, composition, color, and existing homepage sections to
   `design.md`. Write new user-facing copy in Brazilian Portuguese. Support
   keyboard interaction, labeled controls, and clear pending, empty, error, denied,
   and success states as applicable.
   Keep the party gallery separate from contestant-entry photos; party uploads
   remain private until album-wide publication and continue after voting opens.
4. For forms and mutations, follow the real response contract, handle network
   and non-success responses, and restore pending state after failure. A hidden or
   disabled control never replaces server authorization.

## Output checks

- Report affected routes, states, viewports, and any intentional visual
  deviation from `design.md`.
- Run repository-required code checks and the relevant UI runtime checks.
- Check narrow and wide layouts and the applicable loading, empty, error,
  pending, authenticated, and denied states. State any browser or service check
  that could not run.
