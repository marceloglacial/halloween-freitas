# Repository Guidelines

## Project Structure & Module Organization

The project uses Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS. Pages, layouts, loading states, and API handlers live in `app/`; dynamic segments use folders such as `app/resultados/[id]/`. Reusable UI is grouped by feature under `components/`. Put hooks in `hooks/`, shared server logic in `lib/`, declarations in `types/`, and static assets in `public/`.

## Build, Test, and Development Commands

Use pnpm; `pnpm-lock.yaml` is the authoritative lockfile.

- `pnpm install` installs dependencies.
- `pnpm dev` starts the Turbopack development server at `http://localhost:3000`.
- `pnpm build` creates a production build and catches many type and rendering errors.
- `pnpm start` serves the completed production build.
- `pnpm lint` runs the Next.js and TypeScript ESLint rules.
- `pnpm test` runs the Vitest unit and API-handler test suite.
- `pnpm format` applies Prettier, including Tailwind class ordering, across the repository.
- `pnpm migrate:events` backfills event ownership and creates MongoDB indexes; back up the database first.

Run lint and build before opening a pull request.

## Coding Style & Naming Conventions

Write strict TypeScript and prefer the `@/` alias for repository-root imports. Follow the existing two-space indentation and Prettier output; do not manually reorder Tailwind classes. Use kebab-case for component files and route folders (`user-list-item.tsx`), PascalCase for React components, camelCase for functions and variables, and `useX` names for hooks. Keep route-specific code close to its route and extract broadly reused UI into `components/`.

## Testing Guidelines

Vitest covers shared validation, event rules, session signing, and API authorization. Colocate tests as `*.test.ts` or `*.test.tsx`. For every change, run `pnpm test`, `pnpm lint`, and `pnpm build`, then manually exercise affected responsive layouts, loading states, and authentication flows. Add regression tests for authorization, privacy, and voting-integrity fixes.

## Commit & Pull Request Guidelines

Recent history favors short, imperative subjects such as `fix mobile and add back button` and `update home`. Keep each commit focused and describe the user-visible outcome. Pull requests should include a concise summary, testing notes, linked issue when applicable, and screenshots or recordings for visual changes. Call out new environment variables, data migrations, or deployment considerations explicitly.

## Security & Configuration

Store secrets only in ignored `.env*` files. Database-backed routes expect `DATABASE_URL` and `DATABASE_NAME`; never commit credentials or production data. Review server/client boundaries before exposing values through `NEXT_PUBLIC_*` variables.
