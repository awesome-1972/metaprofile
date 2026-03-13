# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
# Development
npm run dev          # Start dev server on port 8080

# Build
npm run build        # Production build
npm run build:dev    # Development build

# Lint
npm run lint         # Run ESLint

# Tests
npm test             # Run all tests once (vitest run)
npm run test:watch   # Run tests in watch mode
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

Tests use `jsdom` environment with globals enabled. Test files are co-located in `src/` and match `**/*.{test,spec}.{ts,tsx}`. Setup file is `src/test/setup.ts`.

## Architecture

This is a **Vite + React + TypeScript** SPA using **shadcn/ui** (Radix UI primitives + Tailwind CSS). The `@` alias maps to `./src`.

### Two co-existing UI generations

**V1 (demo/prototype)** — routes under `/`, `/company/*`, `/professional/*`, `/student/*`, `/veteran/*`
- No real auth; uses a `DemoGate` in `App.tsx` that requires `localStorage.getItem("demo_registered") === "true"` (set at `/demo`)
- Layout: `src/components/layout/AppLayout.tsx` — role-aware sidebar, accepts `role: "company" | "professional" | "student" | "veteran"`
- Static/mock data lives in `src/data/`

**V2 (production)** — routes under `/v2/*`
- Real Supabase auth with roles: `admin`, `company`, `candidate`
- Layout: `src/components/layout/V2AppLayout.tsx` — uses `useAuthV2` hook to display user info and handle sign-out
- Auth guard: `src/components/v2/ProtectedRoute.tsx` — wraps routes with role checks, redirects unauthenticated users to `/v2/auth`
- Auth hook: `src/hooks/useAuthV2.ts` — fetches user roles from `user_roles` table and profile from `profiles` table on session change

### Supabase integration

- Client: `src/integrations/supabase/client.ts` — import as `import { supabase } from "@/integrations/supabase/client"`
- Auto-generated types: `src/integrations/supabase/types.ts` — do not edit manually
- Key tables: `candidates`, `companies`, `profiles`, `user_roles`
- Migrations in `supabase/migrations/`
- Env vars required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

### Routing

All routes defined in `src/App.tsx`. V2 routes are wrapped in `<ProtectedRoute allowedRoles={[...]}>`. V1 routes are inside `<DemoGate>` which redirects to `/demo` if not registered.

### UI components

shadcn/ui components live in `src/components/ui/`. Add new shadcn components via `npx shadcn-ui@latest add <component>`. The `components.json` config uses the `@` alias and `default` style.

### Data fetching

TanStack Query (`@tanstack/react-query`) is set up at the root in `App.tsx`. Use it for server-state. Direct Supabase calls inside hooks or page components for V2.

### Language

The UI is in Ukrainian (Украïнська).
