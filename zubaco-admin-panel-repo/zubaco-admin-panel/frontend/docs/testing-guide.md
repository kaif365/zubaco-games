# Testing Guide

## Stack

- **Vitest** — ESM-native test runner, fast, compatible with Vite config
- **@testing-library/react** — render components and query by accessible roles/text
- **@testing-library/user-event** — simulate real user interactions
- **@testing-library/jest-dom** — custom matchers (`toBeInTheDocument`, etc.)
- **jsdom** — browser-like environment for component tests

## Running Tests

```bash
npm test              # Watch mode
npm run test:run      # Single run (CI)
npm run test:coverage # Coverage report (HTML + text)
```

## Test Structure

```
src/__tests__/
├── components/         UI component tests
│   ├── DataTable.test.tsx
│   ├── EmptyState.test.tsx
│   ├── PageHeader.test.tsx
│   └── StatusBadge.test.tsx
│   └── StatCard.test.tsx
├── hooks/              Custom hook tests
│   ├── useDebounce.test.ts
│   └── usePagination.test.ts
├── services/           Data layer tests
│   ├── games.test.ts
│   └── flagged.test.ts
└── utils/              Pure utility tests
    └── format.test.ts
```

## What to Test

**Test:**
- That a component renders the right content given specific props
- That user interactions trigger the correct handlers
- That hooks produce the correct state transitions
- That service functions filter/paginate correctly
- That utility functions return correct values

**Don't test:**
- Internal implementation details (CSS class names, DOM structure)
- Snapshot tests (they break on every styling change)
- That React or Radix UI work correctly
- Third-party library behavior

## Writing a Component Test

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "@/components/shared/MyComponent";

describe("MyComponent", () => {
  it("renders required content", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls handler on click", async () => {
    const handler = vi.fn();
    render(<MyComponent onClick={handler} />);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledOnce();
  });
});
```

## Writing a Hook Test

```ts
import { renderHook, act } from "@testing-library/react";
import { useMyHook } from "@/hooks/useMyHook";

it("updates state correctly", () => {
  const { result } = renderHook(() => useMyHook());
  act(() => result.current.doSomething());
  expect(result.current.value).toBe(expectedValue);
});
```

## Coverage

Target: ~30%+ meaningful coverage on business logic. Priority:
1. Services (data filtering, pagination, mutations)
2. Shared components (DataTable, StatCard, StatusBadge)
3. Custom hooks (useDebounce, usePagination)
4. Utilities (format functions)

Layout wrappers, page files, and UI primitives are excluded from coverage targets.

## Rules

- Never import or reference real APIs in tests — all tests use mock data via the service layer
- Test files live in `src/__tests__/` mirroring the source folder structure
- Test names should describe behavior, not implementation: `"renders user name"` not `"calls getName()"`
- Update tests when you change component behavior
