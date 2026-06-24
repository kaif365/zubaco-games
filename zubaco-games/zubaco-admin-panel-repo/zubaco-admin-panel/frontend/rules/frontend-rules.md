# Frontend Rules

These rules apply to every file in this codebase. They are not suggestions.

---

## Reusable Components — Use What Exists

**Before writing any UI, check `components/shared/` and `components/ui/` first.**

| Need | Use | Never |
|------|-----|-------|
| A table | `DataTable` | Raw `<table>` |
| A search/filter bar | `TableToolbar` | Custom input + select layout |
| Page navigation | `Pagination` | Custom prev/next buttons |
| A stat metric card | `StatCard` | A custom card with inline growth logic |
| A page title + desc | `PageHeader` | Raw `<h1>` or `<h2>` |
| A "no results" state | `EmptyState` | Plain `<p>No results</p>` |
| A loading placeholder | `Skeleton` or `LoadingState` | Spinner or `display: none` hacks |
| A status label | `GameStatusBadge` / `UserStatusBadge` / etc. | `<Badge variant="...">Active</Badge>` inline |
| A button | `<Button variant="...">` | Raw `<button>` |
| A text input | `<Input>` | Raw `<input>` |
| A dropdown | `<Select>` + `<SelectItem>` | Raw `<select>` |
| A modal | `<Dialog>` + `<DialogContent>` | Custom overlay div |
| A card section | `<Card>` + `<CardContent>` | Custom div with ad-hoc border/shadow |
| A user avatar | `<Avatar>` + `<AvatarFallback>` | A styled `<div>` with initials |
| A divider | `<Separator>` | `<hr>` or `border-t` div |
| Page content wrapper | `<PageContainer>` | Custom div with ad-hoc padding |

**If an existing component doesn't fully meet your need:**
- Add a prop to the existing component
- Do not copy-paste the component and create a variant

---

## Config Rules

- Navigation items MUST come from `src/config/navigation.ts` — never hardcode href strings in JSX
- Route strings MUST come from `src/config/routes.ts` — never use raw strings like `"/games"`
- TanStack Query keys MUST be defined in `src/config/query-keys.ts` — never inline `["games", "list"]`
- Status badge label + variant MUST live in `src/constants/status.ts` — never decide badge color in a component
- Table column definitions MUST live in `features/*/config/columns.tsx` — never define columns inline in JSX
- Filter option arrays MUST be defined in `features/*/config/columns.tsx` alongside their columns

---

## Component Rules

- UI primitives live in `components/ui/` — do not create one-off styled elements that duplicate them
- Shared domain-agnostic components live in `components/shared/`
- Feature-specific components live in `features/*/components/`
- `"use client"` is required on any file that uses hooks, state, or event handlers
- Never put `"use client"` on `page.tsx` files — keep pages as server components
- Never import feature-specific hooks or services into `components/shared/` or `components/ui/`
- Never render `AdminLayout` directly in a page — it is applied by `app/(admin)/layout.tsx`

---

## Code Style

- No comments explaining what the code does — use descriptive names
- No default exports from `config/`, `types/`, `utils/` files — named exports only
- Prefer `function MyComponent()` declaration syntax for components
- Use `cn()` from `utils/cn.ts` for all conditional class merging — never string concatenation
- Type all component props with an explicit `interface` or `type` — no implicit `any`
- No inline object or array literals in JSX that are recreated on every render — extract to constants

---

## Data Fetching

- All data fetching goes through `services/` — no direct `fetch` calls or mock imports in components
- Use TanStack Query (`useQuery`, `useMutation`) for all async state — never `useState` + `useEffect` for server data
- Every list query MUST use `placeholderData: (prev) => prev` to prevent loading flash on page change
- Query keys must come from `config/query-keys.ts`
- Mutations must call `queryClient.invalidateQueries` on success to keep the cache fresh

---

## Styling

- Tailwind utilities only — no inline styles, no CSS modules, no styled-components
- Use design tokens (`bg-primary`, `text-muted-foreground`, `border-border`) — avoid raw Tailwind color classes like `bg-indigo-600`
- Table sections: always wrap `DataTable` in `<Card><CardContent className="p-0">`
- Page sections: `space-y-6` between major sections, `space-y-4` between a toolbar + table + pagination
- Flex gaps: `gap-2` / `gap-3` between items — avoid applying margins directly to children
- Responsive layout: always design mobile-first using `sm:`, `lg:` breakpoints; test at 375px and 1280px

---

## File Structure

- Feature folders MUST have all three subdirectories: `components/`, `hooks/`, `config/`
- Test files live in `src/__tests__/` mirroring source paths — `components/shared/Foo.tsx` → `__tests__/components/Foo.test.tsx`
- One primary export per file — no multi-purpose utility grab-bags
- Mock data files export only static arrays/objects — no filtering or transformation logic inside them
- Service files are the only place that imports from `mocks/` — nothing else should
