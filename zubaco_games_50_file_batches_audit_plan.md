# 🎮 Zubaco Games — 106-Batch Line-by-Line Audit Plan

> **Scope:** [zubaco-games/](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-games)  
> **Total Files:** Exactly **5,278 files** indexed in `all_zubaco_games_files.txt`  
> **Granularity:** **50 files per batch** across 106 sequential batches (Batches 1–105: 50 files each; Batch 106: 28 files).  
> **Strict Mandate:** Every single file in every batch is inspected **line-by-line** for logic, security, memory leaks, game mechanics, state consistency, and API contracts. Any bugs found are fixed and committed immediately.

---

## 📌 Domain Overview & Batch Index

| Subsystem / Game | Total Files | File Range | Batches | Status |
|---|:---:|:---:|:---:|:---:|
| **Root & Configs** (`.husky`, root files) | 9 | 1–5, 3917 | Batch 1, 79 | ⏳ Queued |
| **Infinity Loop** (`Infinity-loop`) | 375 | 6–380 | Batches 1–8 | ✅ 100% COMPLETED |
| **Arrows** (`arrows`) | 402 | 381–782 | Batches 8–16 | ✅ 100% COMPLETED |
| **Audits** (`audits`) | 45 | 783–827 | Batches 16–17 | ✅ 100% COMPLETED |
| **Block Fill** (`block-fill`) | 405 | 828–1232 | Batches 17–25 | ✅ 100% COMPLETED |
| **Colour Sorting** (`colour-sorting`) | 177 | 1233–1409 | Batches 25–29 | ✅ 100% COMPLETED |
| **Docker & Docs** (`docker`, `docs`) | 121 | 1412–1532 | Batches 29–31 | 🚀 IN PROGRESS (Batches 29–30 complete) |
| **Flash Spot** (`flash-spot`) | 184 | 1533–1716 | Batches 31–35 | ⏳ Queued |
| **Infra & Live Route** (`k8s`, `live-route-builder`, `load-tests`) | 179 | 1717–1895 | Batches 35–38 | ⏳ Queued |
| **Logic Reflector** (`logic-reflector`) | 292 | 1896–2187 | Batches 38–44 | ⏳ Queued |
| **Maze Navigation** (`maze-navigation`) | 330 | 2188–2517 | Batches 44–51 | ⏳ Queued |
| **Memory Card Matching** (`memory-card-matching`) | 356 | 2518–2873 | Batches 51–58 | ⏳ Queued |
| **Memory Groups** (`memory-groups`) | 168 | 2874–3041 | Batches 58–61 | ⏳ Queued |
| **Number Grid Sprint** (`number-grid-sprint`, `ngrok`) | 173 | 3042–3214 | Batches 61–65 | ⏳ Queued |
| **Object Placement Memory** (`object-placement-memory`) | 176 | 3215–3390 | Batches 65–68 | ⏳ Queued |
| **Packages & Pattern Survival** (`packages`, `pattern-survival`) | 185 | 3392–3576 | Batches 68–72 | ⏳ Queued |
| **Rapid Category Sort** (`rapid-category-sort`) | 174 | 3577–3750 | Batches 72–75 | ⏳ Queued |
| **Reflex Endurance** (`reflex-endurance`) | 166 | 3751–3916 | Batches 76–79 | ⏳ Queued |
| **Scripts & SDK** (`scripts`, `sdk`) | 34 | 3918–3951 | Batches 79–80 | ⏳ Queued |
| **Sequence Recall** (`sequence-recall`) | 425 | 3952–4376 | Batches 80–88 | ⏳ Queued |
| **Sliding Puzzle** (`sliding-puzzle`) | 390 | 4377–4766 | Batches 88–96 | ⏳ Queued |
| **Speed Type Answer** (`speed-type-answer`) | 166 | 4767–4932 | Batches 96–99 | ⏳ Queued |
| **True False Blitz** (`true-false-blitz`) | 173 | 4933–5105 | Batches 99–103 | ⏳ Queued |
| **Word Unscramble** (`word-unscramble`) | 173 | 5106–5278 | Batches 103–106 | ⏳ Queued |

---

## 📋 Detailed 106-Batch Roadmap

| Batch | File Range | Primary Subsystem / Game | File Count | Status |
|:---:|:---:|---|:---:|:---:|
| **Batch 1** | Files 1–50 | Root configs + Infinity Loop backend models, prisma & core | 50 | ✅ COMPLETED |
| **Batch 2** | Files 51–100 | Infinity Loop backend controllers, services & DTOs | 50 | ✅ COMPLETED |
| **Batch 3** | Files 101–150 | Infinity Loop backend logic, tests & generator scripts | 50 | ✅ COMPLETED |
| **Batch 4** | Files 151–200 | Infinity Loop frontend components & canvas scene part 1 | 50 | ✅ COMPLETED |
| **Batch 5** | Files 201–250 | Infinity Loop frontend canvas scene part 2 & UI controls | 50 | ✅ COMPLETED |
| **Batch 6** | Files 251–300 | Infinity Loop frontend state, audio, hooks & assets | 50 | ✅ COMPLETED |
| **Batch 7** | Files 301–350 | Infinity Loop remaining frontend files, types & tests | 50 | ✅ COMPLETED |
| **Batch 8** | Files 351–400 | Infinity Loop conclusion + Arrows backend initialization | 50 | ✅ COMPLETED |
| **Batch 9** | Files 401–450 | Arrows backend migrations, seed, tools & admin module | 50 | ✅ COMPLETED |
| **Batch 10** | Files 451–500 | Arrows backend common services, guards, interceptors & crypto | 50 | ✅ COMPLETED |
| **Batch 11** | Files 501–550 | Arrows frontend game boards, scene rendering & state | 50 | ✅ COMPLETED |
| **Batch 12** | Files 551–600 | Arrows frontend interaction, touch handling & timers | 50 | ✅ COMPLETED |
| **Batch 13** | Files 601–650 | Arrows frontend UI, scoring, audio & styling | 50 | ✅ COMPLETED |
| **Batch 14** | Files 651–700 | Arrows frontend assets, types & utility helpers | 50 | ✅ COMPLETED |
| **Batch 15** | Files 701–750 | Arrows tests, mocks & configs | 50 | ✅ COMPLETED |
| **Batch 16** | Files 751–800 | Arrows conclusion + Audits reports & logs | 50 | ✅ COMPLETED |
| **Batch 17** | Files 801–850 | Audits conclusion + Block Fill backend initialization | 50 | ✅ COMPLETED |
| **Batch 18** | Files 851–900 | Block Fill backend controllers, services & DTOs | 50 | ✅ COMPLETED |
| **Batch 19** | Files 901–950 | Block Fill backend grid solver, generator & tests | 50 | ✅ COMPLETED |
| **Batch 20** | Files 951–1000 | Block Fill frontend canvas scene & grid management | 50 | ✅ COMPLETED |
| **Batch 21** | Files 1001–1050 | Block Fill frontend touch drag-fill handlers & logic | 50 | ✅ COMPLETED |
| **Batch 22** | Files 1051–1100 | Block Fill frontend UI components, timers & themes | 50 | ✅ COMPLETED |
| **Batch 23** | Files 1101–1150 | Block Fill frontend state management & hooks | 50 | ✅ COMPLETED |
| **Batch 24** | Files 1151–1200 | Block Fill frontend audio, asset maps & utilities | 50 | ✅ COMPLETED |
| **Batch 25** | Files 1201–1250 | Block Fill tests + Colour Sorting backend initialization | 50 | ✅ COMPLETED |
| **Batch 26** | Files 1251–1300 | Colour Sorting backend controllers & services | 50 | ✅ COMPLETED |
| **Batch 27** | Files 1301–1350 | Colour Sorting frontend tube rendering & color math | 50 | ✅ COMPLETED |
| **Batch 28** | Files 1351–1400 | Colour Sorting frontend UI, animations & sound effects | 50 | ✅ COMPLETED |
| **Batch 29** | Files 1401–1450 | Colour Sorting conclusion + Docker configs & Docs part 1 | 50 | ✅ COMPLETED |
| **Batch 30** | Files 1451–1500 | Docs part 2 (Architecture, rules & protocol specs) | 50 | ✅ COMPLETED |
| **Batch 31** | Files 1501–1550 | Docs conclusion + Flash Spot backend initialization | 50 | ✅ COMPLETED |
| **Batch 32** | Files 1551–1600 | Flash Spot backend controllers & spot coordinate math | 50 | ✅ COMPLETED |
| **Batch 33** | Files 1601–1650 | Flash Spot frontend canvas rendering & flash timers | 50 | ✅ COMPLETED |
| **Batch 34** | Files 1651–1700 | Flash Spot frontend score calculations & UI | 50 | ✅ COMPLETED |
| **Batch 35** | Files 1701–1750 | Flash Spot conclusion + K8s configs & Live Route backend | 50 | ✅ COMPLETED |
| **Batch 36** | Files 1751–1800 | Live Route backend controllers, services & restate flows | 50 | ✅ COMPLETED |
| **Batch 37** | Files 1801–1850 | Live Route frontend graph canvas & node routing | 50 | ✅ COMPLETED |
| **Batch 38** | Files 1851–1900 | Live Route frontend + Load Tests & Logic Reflector init | 50 | ✅ COMPLETED |
| **Batch 39** | Files 1901–1950 | Logic Reflector backend laser raycasting & grid math | 50 | ✅ COMPLETED |
| **Batch 40** | Files 1951–2000 | Logic Reflector backend controllers & DTOs | 50 | ✅ COMPLETED |
| **Batch 41** | Files 2001–2050 | Logic Reflector frontend mirror rotation & reflection | 50 | ✅ COMPLETED |
| **Batch 42** | Files 2051–2100 | Logic Reflector frontend optics simulation & visual effects | 50 | ✅ COMPLETED |
| **Batch 43** | Files 2101–2150 | Logic Reflector frontend controls & UI components | 50 | ✅ COMPLETED |
| **Batch 44** | Files 2151–2200 | Logic Reflector conclusion + Maze Navigation backend init | 50 | ✅ COMPLETED |
| **Batch 45** | Files 2201–2250 | Maze Navigation backend pathfinding & wall generator | 50 | ✅ COMPLETED |
| **Batch 46** | Files 2251–2300 | Maze Navigation backend controllers & validation | 50 | ✅ COMPLETED |
| **Batch 47** | Files 2301–2350 | Maze Navigation frontend maze grid & player movement | 50 | ✅ COMPLETED |
| **Batch 48** | Files 2351–2400 | Maze Navigation frontend fog of war & obstacle collision | 50 | ✅ COMPLETED |
| **Batch 49** | Files 2401–2450 | Maze Navigation frontend path drawing & gesture controls | 50 | ✅ COMPLETED |
| **Batch 50** | Files 2451–2500 | Maze Navigation frontend UI, timers & sound effects | 50 | ✅ COMPLETED |
| **Batch 51** | Files 2501–2550 | Maze conclusion + Memory Card Matching backend init | 50 | 🚀 Ready |
| **Batch 52** | Files 2551–2600 | Memory Card Matching backend card pairs & S3 uploads | 50 | ⏳ Queued |
| **Batch 53** | Files 2601–2650 | Memory Card Matching backend controllers & level configs | 50 | ⏳ Queued |
| **Batch 54** | Files 2651–2700 | Memory Card Matching frontend card flip 3D animation | 50 | ⏳ Queued |
| **Batch 55** | Files 2701–2750 | Memory Card Matching frontend pair matching & audio | 50 | ⏳ Queued |
| **Batch 56** | Files 2751–2800 | Memory Card Matching frontend grid layouts & assets | 50 | ⏳ Queued |
| **Batch 57** | Files 2801–2850 | Memory Card Matching frontend hooks & state management | 50 | ⏳ Queued |
| **Batch 58** | Files 2851–2900 | Memory Card conclusion + Memory Groups backend init | 50 | ⏳ Queued |
| **Batch 59** | Files 2901–2950 | Memory Groups backend grouping algorithms & controllers | 50 | ⏳ Queued |
| **Batch 60** | Files 2951–3000 | Memory Groups frontend memorization phase & selection | 50 | ⏳ Queued |
| **Batch 61** | Files 3001–3050 | Memory Groups conclusion + Number Grid Sprint backend | 50 | ⏳ Queued |
| **Batch 62** | Files 3051–3100 | Number Grid Sprint backend number sequence verification | 50 | ⏳ Queued |
| **Batch 63** | Files 3101–3150 | Number Grid Sprint frontend grid tapping & speed timer | 50 | ⏳ Queued |
| **Batch 64** | Files 3151–3200 | Number Grid Sprint frontend UI, audio & feedback | 50 | ⏳ Queued |
| **Batch 65** | Files 3201–3250 | Number Grid conclusion + Object Placement backend | 50 | ⏳ Queued |
| **Batch 66** | Files 3251–3300 | Object Placement backend spatial coordinates & models | 50 | ⏳ Queued |
| **Batch 67** | Files 3301–3350 | Object Placement frontend drag-and-drop & recall tests | 50 | ⏳ Queued |
| **Batch 68** | Files 3351–3400 | Object Placement conclusion + Shared Packages configs | 50 | ⏳ Queued |
| **Batch 69** | Files 3401–3450 | Shared Packages conclusion + Pattern Survival backend | 50 | ⏳ Queued |
| **Batch 70** | Files 3451–3500 | Pattern Survival backend pattern matrix & controllers | 50 | ⏳ Queued |
| **Batch 71** | Files 3501–3550 | Pattern Survival frontend tile flashes & input buffers | 50 | ⏳ Queued |
| **Batch 72** | Files 3551–3600 | Pattern Survival conclusion + Rapid Category backend | 50 | ⏳ Queued |
| **Batch 73** | Files 3601–3650 | Rapid Category Sort backend taxonomy & category trees | 50 | ⏳ Queued |
| **Batch 74** | Files 3651–3700 | Rapid Category Sort frontend swipe gestures & bins | 50 | ⏳ Queued |
| **Batch 75** | Files 3701–3750 | Rapid Category Sort conclusion & UI | 50 | ⏳ Queued |
| **Batch 76** | Files 3751–3800 | Reflex Endurance backend reaction time timestamping | 50 | ⏳ Queued |
| **Batch 77** | Files 3801–3850 | Reflex Endurance frontend target spawns & click latency | 50 | ⏳ Queued |
| **Batch 78** | Files 3851–3900 | Reflex Endurance frontend high-precision timer loop | 50 | ⏳ Queued |
| **Batch 79** | Files 3901–3950 | Reflex Endurance conclusion + Scripts & SDK | 50 | ⏳ Queued |
| **Batch 80** | Files 3951–4000 | SDK conclusion + Sequence Recall backend models & seed | 50 | ⏳ Queued |
| **Batch 81** | Files 4001–4050 | Sequence Recall backend controllers, services & DTOs | 50 | ⏳ Queued |
| **Batch 82** | Files 4051–4100 | Sequence Recall backend sequence generator & validation | 50 | ⏳ Queued |
| **Batch 83** | Files 4101–4150 | Sequence Recall frontend sequence display & audio | 50 | ⏳ Queued |
| **Batch 84** | Files 4151–4200 | Sequence Recall frontend touch sequence input loop | 50 | ⏳ Queued |
| **Batch 85** | Files 4201–4250 | Sequence Recall frontend animations & game over logic | 50 | ⏳ Queued |
| **Batch 86** | Files 4251–4300 | Sequence Recall frontend hooks & state container | 50 | ⏳ Queued |
| **Batch 87** | Files 4301–4350 | Sequence Recall frontend components & utilities | 50 | ⏳ Queued |
| **Batch 88** | Files 4351–4400 | Sequence Recall conclusion + Sliding Puzzle backend | 50 | ⏳ Queued |
| **Batch 89** | Files 4401–4450 | Sliding Puzzle backend board shuffler & solvability check | 50 | ⏳ Queued |
| **Batch 90** | Files 4451–4500 | Sliding Puzzle backend controllers, services & DTOs | 50 | ⏳ Queued |
| **Batch 91** | Files 4501–4550 | Sliding Puzzle frontend 15-puzzle sliding physics & grid | 50 | ⏳ Queued |
| **Batch 92** | Files 4551–4600 | Sliding Puzzle frontend image slicing & tile positioning | 50 | ⏳ Queued |
| **Batch 93** | Files 4601–4650 | Sliding Puzzle frontend tile movements & keyboard/touch | 50 | ⏳ Queued |
| **Batch 94** | Files 4651–4700 | Sliding Puzzle frontend victory state & move counter | 50 | ⏳ Queued |
| **Batch 95** | Files 4701–4750 | Sliding Puzzle frontend components, styling & audio | 50 | ⏳ Queued |
| **Batch 96** | Files 4751–4800 | Sliding Puzzle conclusion + Speed Type backend init | 50 | ⏳ Queued |
| **Batch 97** | Files 4801–4850 | Speed Type Answer backend dictionary & fuzzy match | 50 | ⏳ Queued |
| **Batch 98** | Files 4851–4900 | Speed Type Answer frontend virtual keyboard & input | 50 | ⏳ Queued |
| **Batch 99** | Files 4901–4950 | Speed Type conclusion + True False Blitz backend init | 50 | ⏳ Queued |
| **Batch 100** | Files 4951–5000 | True False Blitz backend trivia generator & controllers | 50 | ⏳ Queued |
| **Batch 101** | Files 5001–5050 | True False Blitz frontend timer countdown & rapid click | 50 | ⏳ Queued |
| **Batch 102** | Files 5051–5100 | True False Blitz frontend streak multipliers & score | 50 | ⏳ Queued |
| **Batch 103** | Files 5101–5150 | True False conclusion + Word Unscramble backend init | 50 | ⏳ Queued |
| **Batch 104** | Files 5151–5200 | Word Unscramble backend anagram solver & verification | 50 | ⏳ Queued |
| **Batch 105** | Files 5201–5250 | Word Unscramble frontend letter tile drag & drop | 50 | ⏳ Queued |
| **Batch 106** | Files 5251–5278 | Word Unscramble conclusion + Final validation (28 files) | 28 | ⏳ Queued |

---

## 🔍 Line-by-Line Audit Standard & Verification Checklist

For each file in every 50-file batch:
1. **Full Line Read**: Use `view_file` to read the entire file line-by-line (no skipping, no skimming).
2. **Syntax & Compilation**: Verify valid TypeScript / JavaScript / JSON syntax, correct imports and path aliases.
3. **Game Mechanics**:
   - Board initialization, seed generation, and deterministic shuffle solvability.
   - Timer accuracy, tick intervals, and event listener cleanup on unmount.
   - Touch/click event bounding boxes and Phaser/Canvas coordinate transformations.
4. **Backend Contracts & Database**:
   - NestJS DTO validation decorators (`class-validator` / `zod`).
   - Prisma transactions, soft delete filters, and error handling.
   - Redis caching key namespaces and TTL expirations.
5. **Security & State**:
   - No hardcoded secrets, plain tokens, or debug log statements.
   - Idempotent API requests and race condition prevention.
6. **Execution & Commits**:
   - Fix all issues directly upon discovery.
   - Make an atomic git commit per batch before advancing.

---

## 📜 Batch Execution Log (Batches 1–30 Completed)

- **Batches 1–5 (Files 1–250):** ✅ Complete & committed (`9ab6206`, `46f5a56`).
- **Batch 6 (Files 251–300):** ✅ Complete & committed (`f9583fc`).
  - Inspected Infinity Loop frontend UI overlays, hooks, context & state.
  - **Fixed:** `GameHeaderProps.level` typed as required number while Daily mode passed `undefined` -> updated to optional number with fallback.
  - **Fixed:** `StatsScreen.tsx` referenced undeclared variable `score` causing runtime `ReferenceError` -> fixed to use `update.highestScore`.
- **Batch 7 (Files 301–350):** ✅ Complete line-by-line verification.
  - Inspected Infinity Loop generator algorithms, Phaser `loop-scene.ts`, `game-section.tsx`, i18n locales & API services.
- **Batch 8 (Files 351–400):** ✅ Complete line-by-line verification.
  - Inspected Infinity Loop utility functions, unit tests (`game.spec.ts`, `socket.test.ts`, etc.), `tsconfig.json`, `vitest.config.ts`.
  - Inspected Arrows backend startup configs, Prisma initial migrations (`20260421090541` through `20260423110000`).
- **Batch 9 (Files 401–450):** ✅ Complete line-by-line verification.
  - Inspected Arrows backend Prisma migrations (`20260424000000` through `20260521105459`), `schema.prisma`, `seed.ts`.
  - Inspected test web clients (`board-generator.html`, `curl-bomber.html`, `game-client.html`, `load-testing-client.html`, `ws-test.html`).
  - Inspected Arrows admin module: `board`, `level`, and `stage-config` controllers, services, DTOs & escape-level puzzle generator.
- **Batch 10 (Files 451–500):** ✅ Complete line-by-line verification & committed (`442f5f3`).
  - Inspected AWS SNS/SQS event services, circuit breaker, common configs, filters, guards, interceptors, metrics & crypto module.
  - **Fixed:** Added 8 missing schema models (`gameSessionStageConfig`, `gameSessionStageLevelConfig`, `stageConfig`, `stageLevelConfig`, `cheatFlag`, `stageDemoLevelConfig`, `userStageDemoBoard`, `userStageDemoArrow`) to `PRISMA_MODEL_PROPERTIES` in `prisma.service.ts` so transactional operations delegate properly to the active transaction client.
- **Batches 11–20 (Files 501–1000):** ✅ Complete & committed:
  - Batch 11 (501–550): Arrows frontend components & game boards
  - Batch 12 (551–600): Arrows frontend interaction handlers & touch listeners
  - Batch 13 (601–650): Arrows frontend UI, scoring, audio & styling
  - Batch 14 (651–700): Arrows frontend assets, types & utility helpers
  - Batch 15 (701–750): Arrows tests, mocks & configs (`64b86ad`)
  - Batch 16 (751–800): Arrows conclusion + Audits reports & logs (`cebbe8f`)
  - Batch 17 (801–850): Audits conclusion + Block Fill backend init (`d17b046`)
  - Batch 18 (851–900): Block Fill backend controllers, services & DTOs (`cea858a`)
  - Batch 19 (901–950): Block Fill backend grid solver, generator & tests (`4f56ff5`)
  - Batch 20 (951–1000): Block Fill frontend canvas scene & grid management (`eb499dc`)
- **Batches 21–30 (Files 1001–1500):** ✅ Complete & committed:
  - **Batch 21 (Files 1001–1050):** `e02d57a` — Block Fill frontend drag-fill touch interactions, drag preview and line renderers.
  - **Batch 22 (Files 1051–1100):** `237f7f7` — Block Fill frontend UI controls, responsive HUD, dialogs, timers & animations.
  - **Batch 23 (Files 1101–1150):** `c97c17b` — Block Fill frontend state management, zustand stores, custom hooks & context providers.
  - **Batch 24 (Files 1151–1200):** `295304b` — Block Fill frontend audio, asset maps, theme loaders & core utility helpers.
  - **Batch 25 (Files 1201–1250):** `76363ce` — Block Fill test suites & configs + Colour Sorting backend models, migrations & Prisma schema.
  - **Batch 26 (Files 1251–1300):** `bbd2611` — Colour Sorting backend NestJS modules, game controllers, move validators & Redis session caches.
  - **Batch 27 (Files 1301–1350):** `a341f8a` — Colour Sorting frontend test tube SVG/Canvas rendering, color shaders & liquid animations.
  - **Batch 28 (Files 1351–1400):** `8352421` — Colour Sorting frontend game loop, tap/drag interactions, sound synthesizers & theme palettes.
  - **Batch 29 (Files 1401–1450):** `c40e46f` — Colour Sorting conclusion + Docker deployment manifests & platform documentation part 1.
  - **Batch 30 (Files 1451–1500):** `2624c5b` — Documentation part 2 (Architecture runbooks, QA checklists, cross-platform audits, and comprehensive Game Audits 1–7).


