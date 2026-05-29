# Architecture

## Core Philosophy

This project follows three guiding principles:
1. **Config-driven** — navigation, routes, columns, status badges, query keys are all defined once in config/constants files, never hardcoded inside components.
2. **Feature-first** — each domain (games, users, flagged, dashboard) owns its hooks, components, and column config. Shared UI lives in `components/shared`.
3. **Swappable data layer** — all data fetching goes through `services/`. Mock implementations can be swapped for real API calls without touching any UI component.

---

## Layers

```
App Pages (app/)
    ↓
Feature Components (features/*/components/)
    ↓  uses
Feature Hooks (features/*/hooks/)  ←  TanStack Query
    ↓  calls
Services (services/)               ←  mock async → real API later
    ↓  reads
Mock Data (mocks/)
```

---

## Config-Driven Patterns

### Navigation
`src/config/navigation.ts` exports `NAV_GROUPS`. The `Sidebar` component maps over this — adding a nav item requires only editing the config, no JSX changes.

### Routes
`src/config/routes.ts` is the single source of truth for all route paths. Use `ROUTES.GAMES` everywhere instead of the string `"/games"`.

### Query Keys
`src/config/query-keys.ts` centralizes all TanStack Query keys. This prevents key mismatches between different query/mutation callsites.

### Column Definitions
Each feature has a `config/columns.tsx` file that returns `ColumnDef<T>[]`. The `DataTable` component is fully generic — it doesn't know anything about games or users.

### Status Badges
`src/constants/status.ts` maps each status enum value to a label + badge variant. Adding a new status variant means editing the constants file, not hunting through JSX.

---

## Component Architecture

### UI Layer (`components/ui/`)
Hand-authored shadcn/ui primitives built on Radix UI. Fully owned — no dependency on the `shadcn` CLI. These are purely presentational with no domain knowledge.

### Shared Layer (`components/shared/`)
Domain-agnostic building blocks: `DataTable`, `StatCard`, `TableToolbar`, `Pagination`, `EmptyState`, etc. These accept data via props and have no service/mock dependencies.

### Layout Layer (`components/layout/`)
`Sidebar`, `Topbar`, `PageContainer`, `AdminLayout`. The `Sidebar` reads from `navigation.ts` config. `AdminLayout` composes the full page shell.

### Feature Layer (`features/*/`)
Each feature is self-contained:
- `hooks/` — TanStack Query hooks wired to service functions
- `components/` — feature-specific UI (tables, modals)
- `config/columns.tsx` — column definitions for DataTable

---

## Server vs Client Components

- **Server components**: all `page.tsx` files, `app/layout.tsx`, `app/(admin)/layout.tsx`, `PageContainer`.
- **Client components** (`"use client"`): anything with hooks, event handlers, or state — `AdminLayout` (mobile sidebar state), `Sidebar` (active link via `usePathname`), `Topbar` (dropdown + menu toggle), `TableToolbar`, all feature tables.
- `AdminLayout` is a client component because it manages `sidebarOpen` state for the mobile slide-in sidebar. Its children (`page.tsx` files) remain server components.

---

## Design System

Defined in `globals.css` via CSS custom properties and `@theme inline`. Key tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#4f46e5` (indigo) | Buttons, active states, icon accent |
| `--sidebar` | `#0f172a` (slate-900) | Dark sidebar background |
| `--background` | `#f8f9fb` | Page background |
| `--card` | `#ffffff` | Cards, tables |
| `--border` | `#e2e8f0` | All borders |
| `--muted-foreground` | `#64748b` | Secondary text |
