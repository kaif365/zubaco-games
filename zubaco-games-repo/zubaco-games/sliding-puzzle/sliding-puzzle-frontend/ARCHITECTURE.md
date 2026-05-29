# Architecture

## Overview

This codebase follows a **feature-based architecture** layered on top of a shared application shell. Every game or product area is isolated inside `src/features/<name>/`, making it possible for multiple developers or teams to work independently without stepping on each other.

---

## Architectural Decisions

### Feature-based over layer-based

Instead of grouping files by technical role (`/components`, `/hooks`, `/services` globally), each domain groups its own components, hooks, API calls, and types together. This makes a feature portable: you can copy or remove an entire `features/<name>/` directory and nothing else breaks.

Shared code (reusable UI, global hooks, HTTP client) lives at the top level only when it is genuinely shared across multiple features.

### TanStack Query instead of global state

Server state (anything that comes from an API) is managed entirely through TanStack Query. This removes the need for a global store like Redux for 95% of use cases. Query keys are scoped per feature, preventing accidental cache collisions.

### Typed environment config

All `import.meta.env` access goes through `src/app/config/appConfig.ts`. This provides a single typed, validated object. Components never read `import.meta.env` directly.

### Lazy routing

All page-level components are lazily loaded via `React.lazy`. This keeps the initial bundle small regardless of how many games/pages are added.

### Strict TypeScript

`tsconfig.app.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noUncheckedSideEffectImports`. These rules prevent entire classes of bugs and are non-negotiable.

---

## Folder Structure Explanation

```
src/
├── app/              → Application shell. Do not put business logic here.
│   ├── config/       → Typed env access (appConfig.ts)
│   ├── providers/    → QueryProvider, ThemeProvider, ToastProvider
│   └── router/       → Route tree, lazy imports, route constants
│
├── components/
│   ├── shared/       → Structural components used across pages
│   │                   (ErrorBoundary, PageLoader, QueryStateHandler)
│   └── ui/           → shadcn/ui primitives. Only UI, no data fetching.
│
├── features/         → One directory per domain/game module
│   └── leaderboard/  → Example feature showing the full pattern
│       ├── api/      → API function (calls httpClient)
│       ├── components/
│       ├── hooks/    → useQuery hooks, query key factories
│       ├── types/    → TypeScript types for this feature only
│       └── __tests__/
│
├── hooks/            → Hooks shared across multiple features
├── lib/              → Standalone helpers (cn utility)
├── pages/            → Route-level components. Thin — delegate to features.
├── services/         → httpClient.ts (Axios instance, interceptors)
├── styles/           → globals.css with Tailwind + CSS custom properties
├── test/             → Jest setup, testUtils.tsx (wrapped render helper)
├── types/            → Global TypeScript interfaces
└── utils/            → Pure functions (formatters, storage)
```

---

## Adding a New Game Module

Follow these steps to add a new game (e.g., "quiz"):

```
src/features/quiz/
├── api/
│   └── quiz.api.ts          # API calls
├── components/
│   └── QuizBoard.tsx        # UI components
├── hooks/
│   └── useQuiz.ts           # TanStack Query hooks
├── types/
│   └── quiz.types.ts        # TypeScript interfaces
├── __tests__/
│   ├── useQuiz.test.ts
│   └── QuizBoard.test.tsx
└── index.ts                 # Public exports
```

Then add a route in `src/app/router/AppRouter.tsx`:

```tsx
const QuizPage = lazy(() => import('@pages/QuizPage'));
// ...
<Route path="/quiz" element={<QuizPage />} />
```

And add the route constant in `src/app/router/routes.ts`:

```ts
QUIZ: '/quiz',
```

---

## Shared vs Feature-Specific Code

| Type | Location | Rule |
|---|---|---|
| UI primitive (Button, Card) | `components/ui/` | No data fetching, no business logic |
| Structural component | `components/shared/` | Used by 2+ features or by pages |
| Feature component | `features/<name>/components/` | Only used inside that feature |
| Feature hook | `features/<name>/hooks/` | Only used inside that feature |
| Cross-feature hook | `hooks/` | Used by 2+ features |
| API function | `features/<name>/api/` | Scoped to feature |
| HTTP client | `services/httpClient.ts` | Shared by all API functions |

When in doubt: start inside the feature. Move up only when a second feature needs it.

---

## Data Fetching Pattern

```
Component
  └── useFeatureQuery (hook in features/<name>/hooks/)
        └── useQuery({ queryKey, queryFn })
              └── featureApi.getData() (in features/<name>/api/)
                    └── get<T>('/endpoint') (from services/httpClient.ts)
```

Query keys are defined as factories in the hook file:

```ts
export const featureKeys = {
  all: ['feature'] as const,
  byId: (id: string) => [...featureKeys.all, id] as const,
};
```

This makes invalidation and cache control explicit and type-safe.

---

## Testing Approach

- **Unit tests**: pure utils in `utils/__tests__/`
- **Component tests**: `components/ui/__tests__/` using `@testing-library/react`
- **Feature tests**: `features/<name>/__tests__/` covering hooks and components
- **Test utilities**: `src/test/testUtils.tsx` exports a `render` that wraps with QueryClient + MemoryRouter
- **Mocking**: use `jest.mock()` at the API layer (`features/<name>/api/`). Never mock React Query internals.

Coverage threshold is set to 70% globally. Aim higher for business-critical features.
