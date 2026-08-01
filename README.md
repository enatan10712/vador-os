# Vador OS

Vador OS is a Next.js 15 restaurant operating system for dashboards, POS, menu management, kitchen display, inventory, and analytics workflows.

## What is included

- Operations dashboard
- POS terminal
- Kitchen display system
- Inventory management
- Staff and analytics pages
- API routes for orders, inventory, notifications, and health
- Supabase integration
- Zustand state management
- React Query data fetching
- Framer Motion UI motion

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project if you want real backend connectivity

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file named `.env.local` in the project root.

3. Add your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

If you do not provide these values, the app will still compile with placeholder defaults, but real auth and data access will not work.

## Run locally

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Build and verify

Production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Lint:

```bash
npm run lint
```

Tests:

```bash
npm test
```

## Scripts

- `npm run dev` - start the Next.js dev server
- `npm run build` - create a production build
- `npm start` - run the built app
- `npm run lint` - run ESLint
- `npm test` - run Vitest
- `npm run test:watch` - run Vitest in watch mode

## Project structure

- `src/app` - App Router pages and API routes
- `src/components` - shared UI and shell components
- `src/lib` - API helpers, auth, validation, and utilities
- `src/store` - Zustand store
- `src/data` - mock data and translations
- `supabase_migrations` - SQL migration files

## Notes

- The app uses a restaurant-inspired dark design system with semantic tokens in `src/app/globals.css`.
- Dashboard metrics and charts are powered by mock data plus React Query fetch hooks.
- API routes use the shared `{ data, error, meta }` envelope.
- The project is safe to run locally with mock defaults, but real tenant and auth features require valid Supabase configuration.

