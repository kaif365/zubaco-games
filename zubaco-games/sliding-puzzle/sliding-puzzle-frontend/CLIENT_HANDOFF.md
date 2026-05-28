# Client Handoff — ZUBACO Games Base

## What Was Delivered

This document summarises the frontend base template delivered for the ZUBACO Games multi-game platform. It is written for non-technical stakeholders and project managers.

---

## Project Overview

The deliverable is a **production-ready frontend base template** that acts as a shared starting point for every game built on the ZUBACO platform. Rather than each game starting from scratch — with different folder structures, testing approaches, and tooling choices — every new game begins from this template, ensuring a consistent, maintainable, and high-quality codebase across the entire platform.

---

## Technology Summary

| Area | Technology | Why it was chosen |
|---|---|---|
| Build tool | Vite 6 | Industry-leading fast builds; standard for modern React projects |
| UI framework | React 19 | The latest stable release of the most widely adopted UI framework |
| Language | TypeScript | Catches errors at development time; improves team productivity |
| Styling | Tailwind CSS | Rapid, consistent UI development with a built-in design token system |
| UI components | shadcn/ui | High-quality, accessible, composable components; no vendor lock-in |
| Data fetching | TanStack Query | Industry standard for server state; handles loading, error, and caching automatically |
| Testing | Jest + React Testing Library | Industry standard; promotes testing behaviour not implementation |

---

## Scalability and Maintainability

### One template, many games

The architecture is designed so that any new game can be added as a self-contained **module** without touching the existing games. Each game lives in its own folder (`src/features/<game-name>/`) and is independent of all other games.

### Design tokens

The visual design system (colours, typography, spacing, border radius) is managed through a central CSS token file. Changing the platform's brand colours requires editing one file — nothing else.

### Code quality is automated

The codebase has automated quality checks built in:

- **Pre-commit hooks**: Every time a developer saves code to version control, linting and formatting run automatically. Bad code cannot be accidentally committed.
- **Pre-push hooks**: TypeScript type checking and all tests run before code is pushed. This prevents broken code from reaching the team.
- **SonarQube integration**: Configured for CI pipeline integration to measure code quality, test coverage, and security issues on every build.

---

## Testing

The template includes a full testing setup:

- **Unit tests** for utility functions
- **Component tests** for UI components
- **Integration tests** for data-fetching logic
- **70% minimum code coverage** enforced — tests must cover at least 70% of the codebase before a build passes in CI

---

## Documentation

The codebase ships with four developer-facing documentation files:

| File | Audience |
|---|---|
| `README.md` | Any developer; getting started and scripts |
| `ARCHITECTURE.md` | Senior developers; architectural decisions and patterns |
| `DEVELOPMENT_GUIDE.md` | All developers; coding standards, naming conventions, testing rules |
| `CLIENT_HANDOFF.md` | Stakeholders and project managers |

---

## Deployment Readiness

- The build command (`npm run build`) produces an optimised static bundle in the `dist/` folder, ready for deployment to any static hosting platform (Vercel, Netlify, AWS S3 + CloudFront, Azure Static Web Apps, etc.).
- Environment-specific configuration is managed through `.env` files, making it straightforward to deploy to development, staging, and production environments.
- The bundle is automatically split into vendor chunks (React, routing, data-fetching libraries), which means the browser only downloads what it needs on the first visit.
- Source maps are generated for production builds, enabling accurate error tracking in monitoring tools.

---

## Handoff Checklist

Before going live, the development team should confirm:

- [ ] `.env.local` (or equivalent) is configured on the deployment environment with correct API URLs
- [ ] SonarQube project is created and `sonar-project.properties` values are updated
- [ ] CI pipeline runs `npm run build`, `npm run test:coverage`, and SonarQube analysis
- [ ] A `CODEOWNERS` file is added to assign code review responsibilities
- [ ] The base template repository is marked as a template in version control so future games can branch from it cleanly
