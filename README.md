# Halloween dos Freitas

Annual editions of the Halloween dos Freitas party, with guest RSVPs, costume
contest entries and voting, published results, and a separate party photo album.

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- MongoDB for edition, RSVP, contestant, round, ballot, result, and photo data
- Clerk for administrator authentication; guests access their edition RSVP by email
- Cloudinary for contest and party images

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

Use `pnpm start` to serve a production build and `pnpm format` to format files.
See `package.json` for available scripts; read the [operations
guide](docs/operations.md) before database or release operations.

## Documentation

- [Product contract](docs/product.md) defines guest, contest, voting, results,
  and party-photo capabilities.
- [Edition lifecycle](docs/lifecycle.md) defines scheduled starts, RSVP and
  contestant cutoffs, voting rounds, and publication transitions.
- [Architecture](docs/architecture.md) defines identity, event isolation,
  persistence, authorization, and photo security boundaries.
- [Data model](docs/data-model.md) defines event-scoped records and references.
- [Testing strategy](docs/testing.md) lists lifecycle, privacy, isolation, and
  concurrency scenarios.
- [AI workflow](docs/ai-workflow.md) describes skill routing, issue execution,
  and review boundaries.
- [UI design reference](design.md) describes the visual language, responsive
  layouts, homepage section arrangement, user journeys, and accessibility.
- [Operations](docs/operations.md) covers local environment, database safety,
  validation, and release boundaries.
- [Repository guidelines](AGENTS.md) defines coding and review instructions for
  contributors and coding agents.
