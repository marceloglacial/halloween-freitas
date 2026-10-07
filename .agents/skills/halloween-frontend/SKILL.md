---
name: halloween-frontend
description: Build or change Halloween Freitas pages, React components, client hooks, responsive layouts, forms, and photo interfaces. Use for public and administrator UI implementation; API-only changes belong to the backend skill.
---

# Halloween Frontend

Resolve project paths from the repository root, three directories above this skill. Follow [AGENTS.md](../../../AGENTS.md) and read the relevant installed guide under `node_modules/next/dist/docs/` before writing Next.js code. Use the current feature's components and styles as the starting point; preserve the user's requested design direction.

## Find the rendering and interaction boundaries

- Public routes use Portuguese names such as `app/votacao/`, `app/resultados/`, and `app/fotos/`. Inspect the route's page, layout, and loading boundary along with its feature components before changing navigation or state.
- Homepage sections live in `components/home/`. `event-lifecycle.tsx` receives server-rendered content and serialized initial event/time, then polls for lifecycle updates. Preserve consistent initial rendering and effect cleanup when changing this interaction.
- Administrator screens start at `app/dashboard/page.tsx` and `components/dashboard/event-dashboard.tsx`. Trace selected year/event and tab state into `hooks/useUsers.tsx`; participant requests must continue to use the selected event rather than implicitly switching to the active event.
- Photo components use `next-cloudinary`. Inspect the existing upload and image components to distinguish Cloudinary public IDs from ordinary URLs; preserve responsive image sizing and meaningful alternative text.

Keep server data fetching and authorization in server components or modules. Add client boundaries where interaction needs hooks or browser APIs, and pass serialized data or rendered children across them. Inspect declarations in `types/` and the actual API response before defining new component props; public participant data uses `PublicUser`, while admin data may use `User`.

## Implement the interaction

Reuse existing feature components, hooks, typography in `util/fonts.ts`, and Tailwind styling in `app/globals.css` where they fit. New user-facing copy should be Portuguese; leave unrelated legacy copy outside the change.

For forms and mutations, follow the actual endpoint contract, handle non-success responses and network errors, and restore pending state after failure. `hooks/useForm.tsx` illustrates registration error messages and Sonner feedback; the root layout already provides the toaster. Support keyboard operation, labeled fields, and accessible dialog focus handling for affected controls.

When changing lifecycle behavior rather than presentation alone, read [halloween-event-workflows](../halloween-event-workflows/SKILL.md) and its architecture pointer. Render availability from server-backed lifecycle data and shared predicates; a hidden or disabled button does not replace server authorization. Inspect the conditional Clerk provider in the root layout when changing sign-in or missing-configuration behavior.

## Verify the user flow

Use [next-dev-loop](../next-dev-loop/SKILL.md) for runtime verification of affected application behavior, following its tooling preflight. Run the code checks required by `AGENTS.md`. Manually check affected layouts on narrow and wide viewports, plus applicable loading, empty, error, and pending states. For authenticated flows, check guest and admin entry points and denied access; for polling changes, check transitions without a reload. Use fixed timestamps in tests for time-dependent rendering logic, following the existing pure helper tests in `util/`.

Report what changed and which flows were verified. State any unavailable browser, account, or service validation explicitly rather than inferring success from the build.
