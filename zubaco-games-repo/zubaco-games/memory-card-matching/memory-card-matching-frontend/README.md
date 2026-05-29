# ZUBACO Games — Base Setup

Production-ready frontend template for building multiple games on a shared engineering foundation.

## Stack

| Layer | Technology |
|---|---|
| Build | Vite 6 |
| Framework | React 19 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3 |
| UI Components | shadcn/ui (Radix UI) |
| Data Fetching | TanStack Query v5 |
| Routing | React Router v7 |
| HTTP | Axios |
| Testing | Jest + React Testing Library |
| Linting | ESLint 9 (flat config) |
| Formatting | Prettier 3 |
| Git Hooks | Husky + lint-staged |
| Code Quality | SonarQube |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# 1. Clone / copy the template
git clone <repo-url> my-game
cd my-game

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and set VITE_API_BASE_URL

# 4. Start dev server
npm run dev
```

App runs at http://localhost:3000.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier format |
| `npm run format:check` | Prettier check (CI) |
| `npm run test` | Run all tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage report |

## Folder Structure

```
src/
├── app/
│   ├── config/        # Typed env config
│   ├── providers/     # React context providers (Query, Theme, Toast)
│   └── router/        # Route definitions, lazy loading
├── assets/            # Static images, fonts, icons
├── components/
│   ├── shared/        # App-wide shared components (ErrorBoundary, PageLoader)
│   └── ui/            # shadcn/ui base components (Button, Card, Input, Dialog)
├── features/
│   └── <feature>/     # Self-contained feature modules
│       ├── api/       # API calls for this feature
│       ├── components/
│       ├── hooks/     # TanStack Query hooks
│       ├── types/
│       └── __tests__/
├── hooks/             # Shared global hooks
├── lib/               # Low-level utilities (cn, etc.)
├── pages/             # Route-level page components
├── services/          # HTTP client, base service layer
├── styles/            # globals.css, design tokens
├── test/              # Test setup, utilities, mocks
├── types/             # Global TypeScript types
└── utils/             # Pure utility functions
```

## Development Workflow

1. Create a feature branch from `main`.
2. Add your feature under `src/features/<feature-name>/`.
3. Write tests in `__tests__/` alongside your feature code.
4. Run `npm run lint && npm run type-check && npm run test` before pushing.
5. Husky will enforce lint on commit and type-check + tests on push.

## Adding a New Game Module

See [ARCHITECTURE.md](./ARCHITECTURE.md#adding-a-new-game-module) for the step-by-step guide.
