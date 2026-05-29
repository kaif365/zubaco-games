# Implementation Guide

---

## Reusable Components

Every component listed here already exists. **Use them — never recreate them.**
If a component doesn't fit your exact need, extend it via props rather than copying it.

---

### `DataTable<T>` — `components/shared/DataTable.tsx`

Generic, fully typed table. Handles loading skeletons, empty state, and row click.

```tsx
import { DataTable } from "@/components/shared/DataTable";
import type { ColumnDef } from "@/types/common";

const columns: ColumnDef<MyType>[] = [
  { key: "name", header: "Name", cell: (row) => <span>{row.name}</span> },
  { key: "status", header: "Status", cell: (row) => <MyStatusBadge status={row.status} /> },
];

<DataTable
  columns={columns}
  data={data ?? []}
  isLoading={isLoading}
  rowKey={(row) => row.id}
  onRowClick={(row) => setSelected(row)}   // optional
  emptyMessage="No records found."         // optional
  loadingRows={6}                          // optional, default 8
/>
```

**Rules:**
- Column definitions MUST live in `features/*/config/columns.tsx`, not inline
- Always pass `isLoading` — never render the table without it
- Always wrap `DataTable` in `<Card><CardContent className="p-0">` for consistent styling

---

### `TableToolbar` — `components/shared/TableToolbar.tsx`

Search input + filter dropdowns + result count. Used above every table.

```tsx
import { TableToolbar } from "@/components/shared/TableToolbar";

<TableToolbar
  search={search}
  onSearchChange={(v) => { setSearch(v); reset(); }}
  total={data?.total}
  filters={[
    {
      key: "status",
      placeholder: "All Statuses",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
      value: statusFilter,
      onChange: (v) => { setStatusFilter(v); reset(); },
    },
  ]}
  actions={<Button size="sm">Export</Button>}  // optional
/>
```

**Rules:**
- Always call `reset()` (from `usePagination`) alongside search/filter changes
- Filter options arrays MUST be defined in `features/*/config/columns.tsx`, not inline here

---

### `Pagination` — `components/shared/Pagination.tsx`

Page navigation + rows-per-page selector. Driven entirely by data from the query.

```tsx
import { Pagination } from "@/components/shared/Pagination";

{data && data.totalPages > 0 && (
  <Pagination
    page={page}
    pageSize={pageSize}
    total={data.total}
    totalPages={data.totalPages}
    onPageChange={goToPage}
    onPageSizeChange={changePageSize}
  />
)}
```

**Rules:**
- Always guard with `data && data.totalPages > 0` — don't render empty pagination
- Use `usePagination()` hook to provide all handlers — never manage page state manually

---

### `StatCard` — `components/shared/StatCard.tsx`

Metric card for dashboard-style stats. Shows value, title, growth indicator.

```tsx
import { StatCard } from "@/components/shared/StatCard";
import { Users } from "lucide-react";

<StatCard
  title="Total Users"
  value={1284}
  growth={12.3}          // positive = green TrendingUp, negative = red TrendingDown
  icon={Users}
  iconColor="text-sky-500"
  isLoading={isLoading}
/>
```

**Rules:**
- Always pass `isLoading` — the card renders its own skeleton
- Use `iconColor` with a Tailwind text utility, not a raw hex
- Stat cards go in a `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4` wrapper

---

### `PageHeader` — `components/shared/PageHeader.tsx`

Title + description + optional action slot. Used at the top of every page.

```tsx
import { PageHeader } from "@/components/shared/PageHeader";

<PageHeader
  title="Games"
  description="Manage and monitor all games on the platform."
  actions={
    <Button size="sm">
      <Plus className="h-4 w-4" /> Add Game
    </Button>
  }
/>
```

**Rules:**
- Every page MUST use `PageHeader` as its first element inside `PageContainer`
- Never write a raw `<h1>` on a page — always use `PageHeader`

---

### `EmptyState` — `components/shared/EmptyState.tsx`

Shown when a query returns no results or a section has no content.

```tsx
import { EmptyState } from "@/components/shared/EmptyState";
import { Gamepad2 } from "lucide-react";

<EmptyState
  title="No games yet"
  description="Add your first game to get started."
  icon={Gamepad2}
  action={<Button size="sm">Add Game</Button>}
/>
```

**Rules:**
- `DataTable` renders an empty state automatically via `emptyMessage` — use `EmptyState` directly only for full-page or section-level empty states
- Always provide a `description` that tells the user what to do next

---

### `StatusBadge` variants — `components/shared/StatusBadge.tsx`

Four typed badge components. Each reads from `constants/status.ts` — no style props needed.

```tsx
import {
  GameStatusBadge,
  UserStatusBadge,
  FlagSeverityBadge,
  FlagStatusBadge,
} from "@/components/shared/StatusBadge";

<GameStatusBadge status={row.status} />     // GameStatus
<UserStatusBadge status={row.status} />     // UserStatus
<FlagSeverityBadge severity={row.severity} /> // FlagSeverity
<FlagStatusBadge status={row.status} />     // FlagStatus
```

**Rules:**
- Never use `<Badge variant="...">` directly for domain statuses — always go through a typed badge component
- When adding a new domain status, add it to `constants/status.ts` first, then create a new typed component

---

### `LoadingState` / `TableLoadingSkeleton` — `components/shared/LoadingState.tsx`

Skeleton placeholders for non-table loading states.

```tsx
import { LoadingState, TableLoadingSkeleton } from "@/components/shared/LoadingState";

<LoadingState rows={5} />                       // stacked skeleton bars
<TableLoadingSkeleton columns={4} rows={8} />   // table-shaped skeleton grid
```

**Rules:**
- `DataTable` handles its own skeleton when `isLoading` is true — don't add `TableLoadingSkeleton` above a `DataTable`
- Use `LoadingState` for cards or list sections that haven't loaded yet

---

### Layout components

```tsx
// Wrap every page's content in PageContainer
import { PageContainer } from "@/components/layout/PageContainer";

<PageContainer>           // px-6 py-6 space-y-6
  <PageHeader ... />
  <YourFeatureTable />
</PageContainer>
```

`AdminLayout` is applied automatically via `src/app/(admin)/layout.tsx`. Never import or render it inside a page.

---

### UI Primitives — `components/ui/`

| Component | When to use |
|-----------|-------------|
| `<Button variant="default">` | Primary actions |
| `<Button variant="outline">` | Secondary / cancel actions |
| `<Button variant="ghost">` | Icon buttons, toolbar actions |
| `<Button variant="destructive">` | Destructive / irreversible actions |
| `<Card>` + `<CardHeader>` + `<CardContent>` | Any content block on a page |
| `<Badge variant="success/warning/destructive/outline">` | Low-level, for non-domain labels |
| `<Input>` | All text inputs — includes built-in focus ring |
| `<Select>` + `<SelectItem>` | Dropdowns — used inside `TableToolbar` filters |
| `<Dialog>` + `<DialogContent>` | Modals — see `FlaggedDetailModal` as reference |
| `<Skeleton>` | Inline loading placeholders |
| `<Avatar>` + `<AvatarFallback>` | User initials — used in user/flagged tables |
| `<Separator>` | Dividers in sidebar or between sections |

**Rules:**
- Never use raw `<button>`, `<input>`, `<select>` HTML elements — always use these primitives
- Never duplicate a primitive — if `Button` doesn't support a variant you need, add the variant to `button.tsx`

---

## Adding a New Page

1. Create `src/app/(admin)/your-page/page.tsx`
2. Add the route to `src/config/routes.ts`
3. Add the nav item to `src/config/navigation.ts`
4. Create `src/features/your-page/` with `components/`, `hooks/`, `config/`

---

## Adding a New Feature Module

```
src/features/your-feature/
├── components/
│   └── YourTable.tsx
├── hooks/
│   └── useYourData.ts
└── config/
    └── columns.tsx
```

### Hook
```ts
export function useYourData({ page, pageSize, search, status }: Params) {
  return useQuery({
    queryKey: QUERY_KEYS.YOUR_FEATURE.LIST({ page, pageSize, search, status }),
    queryFn: () => fetchYourData({ page, pageSize, search, status }),
    placeholderData: (prev) => prev,
  });
}
```

### Columns
```tsx
export function getYourColumns(): ColumnDef<YourType>[] {
  return [
    { key: "name", header: "Name", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "status", header: "Status", cell: (row) => <YourStatusBadge status={row.status} /> },
  ];
}

export const YOUR_STATUS_FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
```

### Table component
```tsx
"use client";

export function YourTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search);
  const { page, pageSize, goToPage, changePageSize, reset } = usePagination();
  const { data, isLoading } = useYourData({ page, pageSize, search: debouncedSearch, status: statusFilter });
  const columns = getYourColumns();

  return (
    <div className="space-y-4">
      <TableToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); reset(); }}
        total={data?.total}
        filters={[{
          key: "status",
          placeholder: "All Statuses",
          options: YOUR_STATUS_FILTER_OPTIONS,
          value: statusFilter,
          onChange: (v) => { setStatusFilter(v); reset(); },
        }]}
      />
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            rowKey={(r) => r.id}
            emptyMessage="No records found."
          />
        </CardContent>
      </Card>
      {data && data.totalPages > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      )}
    </div>
  );
}
```

---

## Replacing Mock Data with Real APIs

Edit only `src/services/your-service.ts`. The hook and component are untouched.

```ts
// Before
export async function fetchGames(params) {
  await delay(400);
  // filter MOCK_GAMES...
}

// After
export async function fetchGames(params) {
  const qs = new URLSearchParams({ ...params, page: String(params.page) });
  const res = await fetch(`/api/games?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json(); // must return PaginatedResponse<Game>
}
```

The return type must match `PaginatedResponse<T>` from `types/common.ts`.

---

## Adding a New Status Badge Type

1. Add the type to `src/types/*.ts`
2. Add the config entry to `src/constants/status.ts`
3. Add a typed component to `src/components/shared/StatusBadge.tsx`
4. Use the new component in `features/*/config/columns.tsx`

---

## Design Tokens

Edit `src/app/globals.css` under `:root` to change the color scheme globally. Never use raw hex values in component files.
