# Testing Guide

## Test Types

- Unit tests: `tests/unit/*.test.ts` (Vitest)
- End-to-end tests: `tests/e2e/*.spec.ts` (Playwright)

## Commands

- `npm run test` - runs unit tests once
- `npm run test:watch` - runs unit tests in watch mode
- `npm run test:e2e` - runs Playwright E2E tests

Use Node.js `20.12.0` or newer for local checks. The app is on Next.js 16 and the current Vitest/Rolldown toolchain expects Node 20 APIs.

## Current Coverage Focus

### Unit

- Grid connection utilities
- Puzzle generation behavior
- Local storage/game storage utilities
- Unit test filenames follow kebab-case naming (for example, `game-contracts.test.ts`, `map-stage-content-api.test.ts`, `translations.test.ts`).
- Contract stability tests for socket event names, storage keys, and audio config defaults
- Rotate payload contract checks for `timestamp` and `boardId` on single and batched move events
- Service/endpoint tests for URL generation and game service method routing
- Audio lifecycle regression checks around reconnect/resume flows (single bg track, no duplicate playback)

### E2E

- Instructions route: welcome modal and primary CTA
- Settings drawer: complexity controls disabled messaging; audio-effects switch on/off
- Additional e2e failure context artifacts are written to `test-results/` by Playwright

## Recommended Local Workflow

1. Run `npm run lint` before pushing.
2. Run `npm run test` for fast regression checks.
3. Run `npm run test:e2e` for full interaction validation when UI/game flow changes.
