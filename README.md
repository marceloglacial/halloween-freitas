# Halloween Freitas

A modern event landing page built with Next.js, React, and Tailwind CSS for the Halloween Freitas event. Features include a countdown timer, event info, schedule, registration form, and responsive design.

## Features

- Countdown timer to event
- Event information and schedule
- Registration form (API route)
- Custom card components
- Responsive layout
- Optimized fonts and assets

## Tech Stack

- Next.js (App Router)
- React
- Tailwind CSS
- TypeScript

## Project Structure

```
app/         # Main app directory (routing, layout, pages, API)
components/  # Reusable UI components (card, countdown, form, home, footer)
constants/   # Global constants
hooks/       # Custom React hooks
public/      # Static assets (images, video)
types/       # TypeScript type definitions
util/        # Utility functions
```

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Editing

- Main page: `app/page.tsx`
- Layout: `app/layout.tsx`
- Global styles: `app/globals.css`
- Components: `components/`
- API route: `app/api/register/route.ts`

## Deployment

Deploy easily on [Vercel](https://vercel.com/) or any platform supporting Next.js.

---

For questions or contributions, feel free to open an issue or pull request.
