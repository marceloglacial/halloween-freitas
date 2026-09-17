# Repository Guidelines

## Project structure

This is a Next.js 16 App Router application using React 19, strict TypeScript,
Tailwind CSS 4, Clerk, MongoDB, and Cloudinary.

- `app/` contains pages, layouts, loading/error boundaries, and API handlers.
- `components/` contains reusable UI grouped by feature.
- `hooks/` contains client hooks; `lib/` contains shared domain and server logic;
  `util/` contains small framework-independent helpers.
- `types/` contains global declarations, `scripts/` operational scripts, and
  `public/` static assets.

Read `docs/architecture.md` before changing event, voting, authorization, or
data-ownership behavior. Read `docs/operations.md` before changing environment,
migration, or deployment behavior.

## Commands

Use Node.js 22.13 or newer and pnpm; `pnpm-lock.yaml` is authoritative.

- `pnpm install` installs dependencies.
- `pnpm dev` starts the development server at `http://localhost:3000`.
- `pnpm test` runs the Vitest suite once.
- `pnpm lint` runs ESLint.
- `pnpm build` creates a production build.
- `pnpm start` serves a completed production build.
- `pnpm format` applies Prettier and Tailwind class ordering repository-wide.
- `pnpm migrate:events` mutates event data and indexes; follow the operations
  guide and back up the database first.

For code changes, run `pnpm test`, `pnpm lint`, and `pnpm build`. Manually check
affected responsive layouts, loading/error states, and authentication flows for
UI changes. For documentation-only changes, formatting and link checks suffice.

## Code conventions

Use two-space indentation and let Prettier order Tailwind classes. Prefer the
`@/` alias for repository-root imports. Use kebab-case for new component files
and route folders, PascalCase for React components and types, camelCase for
functions and variables, and `useX` for hooks. Do not rename unrelated legacy
files merely to match these conventions.

Keep route-specific code close to its route and extract broadly reused behavior.
Keep database and authorization logic in server modules. Parse and normalize
requests through shared `lib/` helpers, return explicit HTTP statuses with
Portuguese user-facing errors, and serialize MongoDB IDs and dates for clients.

## Required invariants

- Scope users, categories, and votes by `eventId`.
- Store registration schedules as BSON dates and interpret them with the
  event's IANA timezone.
- Accept registrations only for the active event during its registration
  window; allow admins to open voting only after the event starts; accept votes
  only while voting is open; publish results only after voting ends and an admin
  explicitly enables them.
- Derive guest voter identity from the signed, HTTP-only `guest_session` cookie,
  never from a client-supplied voter ID.
- Protect `/api/admin/*` with Clerk and require
  `publicMetadata.role === "admin"`.
- Never return email addresses from public endpoints.
- Preserve uniqueness for `(eventId, normalizedEmail)` registrations and
  `(eventId, voterId, categoryId)` votes.

## Testing and review

Colocate tests as `*.test.ts` or `*.test.tsx`. Cover invalid input and failure
statuses in route tests. Add regression tests for authorization, privacy,
schedule boundaries, normalization, and voting integrity; use fixed or injected
dates instead of wall-clock-dependent assertions.

When making changes, update relevant documentation and `AGENTS.md` files
whenever the change affects documented behavior, architecture, workflows, or
contributor instructions.

Use short, imperative commit subjects. Pull requests should summarize the
user-visible outcome and validation, link an issue when applicable, and include
screenshots for visual changes. Call out environment changes, migrations,
indexes, and deployment requirements explicitly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
