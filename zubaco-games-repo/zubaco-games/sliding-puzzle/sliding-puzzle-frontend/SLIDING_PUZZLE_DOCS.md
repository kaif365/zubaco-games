# Sliding Puzzle: Technical Documentation & Backend Integration Guide

This document provides a detailed overview of the Sliding Puzzle game architecture and outlines the strategy for future backend integration.

## 1. Game Architecture

The Sliding Puzzle is built using a **Feature-Based Architecture**, ensuring high modularity and testability.

### Key Components

- **Game Logic Hook (`useSlidingPuzzleGame`)**:
  - Manages the entire game state: active category, levels, player progress, and scoring.
  - Handles move logic (`handleMove`), game initialization (`initGame`), and level completion (`checkWin`).
  - **Location**: `src/hooks/useSlidingPuzzleGame.ts`

- **Board Controller (`board.ts`)**:
  - Contains pure function logic for calculating winning moves, checking solvability, and board shuffling using a Secure Random Number Generator (CSPRNG).
  - **Location**: `src/lib/sliding-puzzle/board.ts`

- **API Interface (`httpClient`)**:
  - Centralized Axios instance with request/response interceptors for authentication and error handling.
  - **Location**: `src/services/httpClient.ts`

- **Real-time Communication (`socketClient`)**:
  - Managed socket connection for real-time state synchronization and live leaderboards.
  - **Location**: `src/services/socketClient.ts`

---

## 2. Backend Integration Strategy

The game is designed to transition seamlessly from a local-first model to a client-server model.

### A. Data Synchronization
Currently, levels and categories are loaded from a local JSON store if the API fails. In a full backend setup:
- **Fetch Categories/Levels**: Re-enable TanStack Query hooks in `useSlidingPuzzleGame` to fetch data from `/api/v1/sliding-puzzle/categories`.
- **Sync Progress**: When a level is completed, the game emits a POST request to `/api/v1/sliding-puzzle/progress` to persist scores and completion status.

### B. Real-time Features (Socket.io)
The `socketManager` is already present in the codebase. Future implementations should:
- **Join Level Room**: `socket.emit('join:level', { levelId })` to sync status with other players.
- **Move Updates**: `socket.emit('player:move', { matrix, moves })` for race modes.
- **Live Leaderboard**: Listen for `game:stats` events to update the UI without page refreshes.

### C. Authentication
The `httpClient` interceptors are configured to automatically attach the `auth_token` from `localStorage` to all requests. This ensures that progress sync is only attempted for authenticated users.

---

## 3. Quality & Testing Standards

To maintain the high quality established during the stabilization phase, follow these standards:

### Testing
- **Coverage**: Maintain >80% coverage on new code.
- **Mocks**: Use strictly typed mocks (via `jest.mocked`) to avoid `any` assignments in tests.
- **Isolation**: Use `jest.resetModules()` and `await import()` in tests that rely on module-level side effects (like API registrations).

### SonarQube Quality Gate
The project is configured to run a local Sonar scan through `npm run sonar`. The current Quality Gate requirements are:
- **Bugs/Vulnerabilities**: 0
- **Code Smells**: 0
- **Coverage**: >80% 
- **Duplication**: <3%

---

## 4. Operational Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run lint` | Check for code quality and type issues |
| `npm run test:coverage` | Verify test suite and coverage |
| `npm run sonar` | Execute full quality audit |

---

