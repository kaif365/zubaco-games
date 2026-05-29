# Testing Rules

## Mandatory Rules

- Tests MUST be updated when the component/hook/service they cover changes behavior
- Test names MUST describe behavior, not implementation: `"shows error when empty"` not `"calls setState"`
- Never use snapshot tests — they break on every styling change and provide no real coverage value
- Never mock internal functions — test the real behavior through the public API
- Service tests must run against the actual mock data (no double-mocking)

## What Must Be Tested

| Category | Must Test | Skip |
|----------|-----------|------|
| Shared components | Renders correct content per props; interactions trigger handlers | Internal DOM structure |
| Custom hooks | State transitions; timer behavior (fake timers) | Internal implementation |
| Services | Filtering, pagination, mutation side effects | Network details |
| Utilities | Return values for all meaningful inputs | Trivial pass-throughs |
| Feature components | Integration with hooks via mocked query client | Internal component state |

## File Placement

- `src/__tests__/components/` — for `src/components/`
- `src/__tests__/hooks/` — for `src/hooks/`
- `src/__tests__/services/` — for `src/services/`
- `src/__tests__/utils/` — for `src/utils/`
- `src/__tests__/features/` — for feature-level integration tests (future)

## Test Quality Checklist

Before merging a PR with new functionality:
- [ ] New component has at least one test for each meaningful prop combination
- [ ] New hook has tests for initial state and each state transition
- [ ] New service function has tests for happy path and edge cases (empty results, not-found)
- [ ] New utility function has tests for all branches
- [ ] `npm run test:run` passes with zero failures

## Coverage Targets

| Path | Target |
|------|--------|
| `src/services/` | 80%+ |
| `src/hooks/` | 80%+ |
| `src/utils/` | 90%+ |
| `src/components/shared/` | 60%+ |
| `src/components/ui/` | exempt |
| `src/app/` | exempt |
