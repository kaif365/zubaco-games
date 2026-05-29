# ZUBACO Admin Panel

A production-ready, config-driven frontend admin panel for the ZUBACO multi-game platform. Built with Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, and TanStack Query v5.

## Tech Stack

| Tool | Version | Why |
|------|---------|-----|
| Next.js (App Router) | 16.x | File-based routing, server/client split, layout nesting |
| React | 19.x | Latest concurrent features |
| TypeScript | 5.x | Type safety across the full stack |
| Tailwind CSS | v4 | CSS-first theming, utility-first design |
| shadcn/ui | Manual | Composable, owned UI primitives — no black box |
| TanStack Query | v5 | Async state, caching, loading/error states |
| Vitest + Testing Library | Latest | Fast ESM-native testing |

> **No Vite needed.** Next.js ships its own bundler. Vite is only for non-Next.js React apps.

---

## Setup

```bash
npm install
npm run dev        # Start dev server → http://localhost:3000
npm run test:run   # Run tests once
npm run test:coverage  # Coverage report
npx tsc --noEmit   # Type check
```

Auto-redirects to `/dashboard` on load.

---

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Stats, chart placeholders, activity feed |
| `/games` | Games table with search + status filter + pagination |
| `/users` | Users table with search + status filter + pagination |
| `/flagged` | Flagged users with Mark Safe / Suspend actions + detail modal |

---

## Folder Structure

```
src/
├── app/                    Next.js App Router
│   ├── (admin)/            Route group — all pages share AdminLayout
│   ├── layout.tsx          Root layout with QueryProvider
│   └── page.tsx            Redirect → /dashboard
├── components/
│   ├── ui/                 shadcn primitives (Button, Badge, Card, Input, etc.)
│   ├── layout/             Sidebar, Topbar, AdminLayout, PageContainer
│   └── shared/             DataTable, StatCard, Pagination, PageHeader, etc.
├── features/               Feature-first modules
│   ├── dashboard/          hooks + components
│   ├── games/              hooks + components + config/columns.tsx
│   ├── users/              hooks + components + config/columns.tsx
│   └── flagged/            hooks + components + config/columns.tsx
├── config/                 routes.ts, navigation.ts, query-keys.ts
├── constants/              status.ts — badge configs, page size options
├── hooks/                  useDebounce, usePagination
├── mocks/                  Static data — games, users, flagged, dashboard
├── services/               Async fetchers with simulated delay
├── types/                  TypeScript interfaces — game, user, flagged, common
├── utils/                  cn(), format.ts
├── providers/              QueryProvider
└── __tests__/              Unit tests — components, hooks, services, utils
```

---

## Running Tests

```bash
npm run test:run
# 71 tests passing across 10 test files
```

See [docs/testing-guide.md](docs/testing-guide.md) for coverage details.
