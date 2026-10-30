# ⚠️ TEMPORARY - DEV WEB LOBBY

## What is this?

This is a **temporary development launcher** running on `http://localhost:3009` created to launch, test, and debug all 20 ZUBACO cognitive skill games from a desktop browser during local development.

## Why does it exist?

The primary production client is the React Native mobile app (`zubaco-mobile`). Since local workstations may not run heavy Android/iOS emulators during backend development, this lightweight browser launcher generates valid HMAC-SHA256 JWT sessions on the fly and routes developers directly to any frontend and backend service.

## Quickstart

```bash
# Start the launcher on port 3009:
npm start
# Or:
npm run dev
```

Visit [http://localhost:3009](http://localhost:3009) to view all games, monitor backend status, and launch games.

---

## 🎮 Port Mapping Reference (All 20 Games)

| Game Name | Stage | Frontend Port | Backend Port | Game Slug |
|---|:---:|:---:|:---:|---|
| **Sequence Recall** | 1 | `3129` | `3130` | `sequence-recall` |
| **Memory Cards** | 1 | `3115` | `3116` | `memory-card-matching` |
| **Flash Spot** | 1 | `3105` | `3106` | `flash-spot` |
| **Object Placement** | 1 | `3121` | `3122` | `object-placement-memory` |
| **Sliding Puzzle** | 2 | `3131` | `3132` | `sliding-puzzle` |
| **Block Fill** | 2 | `3103` | `3104` | `block-fill` |
| **Colour Sorting** | 2 | `3005` | `3006` | `colour-sorting` |
| **Rapid Sort** | 2 | `3125` | `3126` | `rapid-category-sort` |
| **Maze Navigation** | 3 | `3113` | `3114` | `maze-navigation` |
| **Infinity Loop** | 3 | `3107` | `3108` | `Infinity-loop` |
| **Word Unscramble** | 3 | `3011` | `3012` | `word-unscramble` |
| **True False Blitz** | 3 | `3135` | `3136` | `true-false-blitz` |
| **Arrows** | 4 | `3101` | `3102` | `arrows` |
| **Logic Reflector** | 4 | `3111` | `3112` | `logic-reflector` |
| **Number Grid** | 4 | `3119` | `3120` | `number-grid-sprint` |
| **Live Route** | 4 | `3109` | `3110` | `live-route-builder` |
| **Memory Groups** | 5 | `3117` | `3118` | `memory-groups` |
| **Reflex Endurance** | 5 | `3127` | `3128` | `reflex-endurance` |
| **Pattern Survival** | 5 | `3123` | `3124` | `pattern-survival` |
| **Speed Type** | 5 | `3133` | `3134` | `speed-type-answer` |

---

## What needs to happen later?

This entire `zubaco-web-lobby/` folder will be replaced when the production player web frontend is built. The production version should:
- Match the mobile app's design system, layout, and UX.
- Connect to the central Platform API (`zubaco-platform`) for authentication, wallet transactions, KYC, and real-time multiplayer tournaments.
- Load games via sandboxed iframes or micro-frontend modules.
- Be built with Next.js or Vite SSR.
