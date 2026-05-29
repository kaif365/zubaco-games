# Development Guide

## Coding Standards

### TypeScript

- Enable all strict flags. Do not use `any` — use `unknown` and narrow it.
- Prefer `interface` for public shapes (props, API response types). Use `type` for unions and utility types.
- Use `as const` for static lookup objects (route constants, query key factories).
- Avoid non-null assertions (`!`). Use optional chaining and proper guards.

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Component | PascalCase | `LeaderboardTable` |
| Hook | camelCase, `use` prefix | `useLeaderboard` |
| Utility function | camelCase | `formatScore` |
| Type / Interface | PascalCase | `LeaderboardEntry` |
| Constant | SCREAMING_SNAKE_CASE | `ROUTES` |
| CSS class | kebab-case (Tailwind) | `bg-primary` |
| File (component) | PascalCase `.tsx` | `LeaderboardTable.tsx` |
| File (hook/util) | camelCase `.ts` | `useLeaderboard.ts` |
| Test file | same name + `.test.ts(x)` | `LeaderboardTable.test.tsx` |

### Component Rules

- One component per file. Named export preferred over default export (except pages).
- Pages use default export (required by `React.lazy`).
- Props interfaces are defined in the same file as the component.
- Avoid prop drilling beyond 2 levels — use context or colocate state.
- Do not fetch data inside a UI component. Delegate to a custom hook.

```tsx
// Good
function LeaderboardTable({ gameId }: { gameId: string }) {
  const { data, isLoading, isError, error } = useLeaderboard({ gameId });
  // ...
}

// Bad — data fetching directly in component body with useQuery
```

### Hook Rules

- Hooks in `features/<name>/hooks/` must only be used inside that feature.
- Hooks in `src/hooks/` are shared utilities (e.g., `useDebounce`, `useToast`).
- Always export query key factories alongside the hook — they are needed for invalidation.
- Keep hooks focused: one hook per concern. Don't mix query + mutation in one hook.

### API Layer Rules

- API functions live in `features/<name>/api/<feature>.api.ts`.
- They must use the typed helper functions from `services/httpClient.ts` (`get`, `post`, `put`, `patch`, `del`).
- Return the typed response directly. Do not catch errors at the API layer — let TanStack Query handle them.

---

## Linting and Formatting

ESLint is configured with:
- TypeScript strict rules (`@typescript-eslint/recommended-type-checked`)
- React hooks rules
- Accessibility rules (`jsx-a11y`)
- Import ordering

Run before pushing:

```bash
npm run lint
npm run format:check
npm run type-check
```

Auto-fix:

```bash
npm run lint:fix
npm run format
```

Husky runs `lint-staged` on pre-commit (lint + format staged files only) and `type-check + test` on pre-push.

---

## Testing Expectations

### What to test

- Every utility function in `utils/` must have tests.
- Every reusable UI component in `components/ui/` must have tests for key behavior.
- Every TanStack Query hook in `features/<name>/hooks/` must have tests for success, error, and disabled states.
- Feature components that contain conditional rendering must have tests for each branch.

### What not to test

- Tailwind class strings — test behavior, not styling.
- Third-party library internals.
- Implementation details (internal state, refs).

### Test file placement

```
src/utils/__tests__/formatters.test.ts
src/components/ui/__tests__/button.test.tsx
src/features/leaderboard/__tests__/useLeaderboard.test.ts
src/features/leaderboard/__tests__/LeaderboardTable.test.tsx
```

### Using testUtils

Always import `render` from `src/test/testUtils.tsx` — it wraps components with QueryClient and MemoryRouter automatically.

```tsx
import { render, screen } from '@/test/testUtils';
```

### Mocking APIs

Mock at the API module level:

```ts
jest.mock('../api/leaderboard.api');
const mockApi = leaderboardApi as jest.Mocked<typeof leaderboardApi>;
mockApi.getLeaderboard.mockResolvedValue(mockData);
```

---

## Environment Variables

All environment variables must:
1. Be declared in `src/vite-env.d.ts` (for TypeScript typing).
2. Be added to `.env.example` with a placeholder value and comment.
3. Be accessed only through `src/app/config/appConfig.ts` — never `import.meta.env` directly in components.

---

## Code Quality Targets

| Metric | Target |
|---|---|
| TypeScript errors | 0 |
| ESLint warnings | 0 |
| Test coverage (lines) | ≥ 70% |
| SonarQube code smells | 0 critical/major |
| Bundle size (initial JS) | < 150 kB gzipped |
