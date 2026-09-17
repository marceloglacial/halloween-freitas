# Halloween dos Freitas

Event registration, costume voting, published results, and a photo gallery for
the annual Halloween dos Freitas event.

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- MongoDB for event, participant, category, and vote data
- Clerk for administrator authentication
- Cloudinary for participant images

## Quick start

You need Node.js 22.13 or newer, pnpm 12.4.2, MongoDB with transaction support,
and Clerk and Cloudinary projects.

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`, then start the application with `pnpm dev` and open
`http://localhost:3000`. See the [operations guide](docs/operations.md) for the
complete environment reference and local service requirements.

## Development commands

```bash
pnpm test
pnpm lint
pnpm build
```

Other available commands are `pnpm start`, `pnpm format`, and the data-mutating
`pnpm migrate:events`. Follow the operations guide before running the migration.

## Documentation

- [Architecture and domain rules](docs/architecture.md) explains event
  ownership, lifecycle, voting, authorization, and privacy boundaries.
- [Operations](docs/operations.md) covers environment configuration, local
  development, administrator setup, migrations, validation, and deployment.
- [Repository guidelines](AGENTS.md) defines coding and review instructions for
  contributors and coding agents.
