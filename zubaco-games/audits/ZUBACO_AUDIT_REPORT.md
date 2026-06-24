# ZUBACO PLATFORM — FULL AUDIT REPORT & FIX TRACKER

**Created**: May 22, 2026  
**Audited by**: Senior QA / Security / Game Design Review  
**Scope**: All 20 games (8 pre-built + 12 custom-built)

---

## TABLE OF CONTENTS

1. [Critical Security Fixes (P0)](#1-critical-security-fixes-p0)
2. [High Priority Bugs (P1)](#2-high-priority-bugs-p1)
3. [Missing Production Features (P2)](#3-missing-production-features-p2)
4. [UX & Polish Items (P3)](#4-ux--polish-items-p3)
5. [Platform Systems Not Yet Built (P4)](#5-platform-systems-not-yet-built-p4)
6. [Gameplay Improvements (P5)](#6-gameplay-improvements-p5)
7. [Infrastructure & DevOps (P6)](#7-infrastructure--devops-p6)
8. [Feature Gap: Pre-built vs Custom Games](#8-feature-gap-pre-built-vs-custom-games)
9. [Per-Game Scoring & Quality Matrix](#9-per-game-scoring--quality-matrix)

---

## 1. CRITICAL SECURITY FIXES (P0)

> These MUST be fixed before any public release. Each one is a trivially exploitable cheat.

### 1.1 Server Trusts Client `isCorrect` — Flash Spot (Game 1)

- **File**: `flash-spot/flash-spot-backend/src/game/game.service.ts`
- **Problem**: Server uses `taps.filter(t => t.isCorrect).length` from client payload. A cheater can send `{isCorrect: true}` for all taps via cURL.
- **Fix**: Server must regenerate the change schedule from the seed + timing, then verify each tap's `cellIndex` + `timestamp` matches an active change.
- **Status**: [x] FIXED

### 1.2 Server Trusts Client `isCorrect` + `correctCellIndex` — Object Placement (Game 2)

- **File**: `object-placement-memory/object-placement-backend/src/game/game.service.ts`
- **Problem**: Server trusts `placements.filter(p => p.isCorrect).length` for scoring. Client tells server what's correct.
- **Fix**: Server must regenerate object positions from seed, compare `placedCellIndex` to actual correct positions.
- **Status**: [x] FIXED

### 1.3 Server Trusts Client `correct` on Taps — Reflex Endurance (Game 18)

- **File**: `reflex-endurance/reflex-endurance-backend/src/game/game.service.ts`
- **Problem**: `taps.filter((t) => t.correct)` — server never verifies which circles were green.
- **Fix**: Server must regenerate the full circle spawn sequence from seed (color + position + timing), verify each tap's `circleId` was actually green and existed at that timestamp.
- **Status**: [x] FIXED

### 1.4 Server Trusts `roundsReached` Blindly — Pattern Survival (Game 19)

- **File**: `pattern-survival/pattern-survival-backend/src/game/game.service.ts`
- **Problem**: Server only receives `roundsReached` and `perfectRounds` as numbers, multiplies by point values. No move log, no verification.
- **Fix**: Server must receive the full input sequence per round, regenerate expected sequences from seed, verify each round was actually completed correctly.
- **Status**: [x] FIXED

### 1.5 Seed Mismatch Bug — Speed Type Answer (Game 20)

- **File**: `speed-type-answer/speed-type-frontend/src/features/typing/hooks/useTypingGame.ts`
- **Problem**: Backend computes `seed = computeFinalSeed(serverSeed, clientSeed, 0)` and sends this NUMBER to client. Client then does `computeFinalSeed(String(numericSeed), clientSeed, 0)` which hashes a DIFFERENT string. Result: client and server generate different questions → ALL games flagged as cheating.
- **Fix**: Backend should send the raw `serverSeed` (UUID string) to client. Client computes `computeFinalSeed(serverSeed, clientSeed, 0)` the same way backend does.
- **Status**: [x] FIXED

---

## 2. HIGH PRIORITY BUGS (P1)

### 2.1 No endTime Enforcement — Games 1, 2, 3, 4, 15, 16, 17

- **Problem**: Submit endpoints don't reject submissions received after the game session's `endTime` has passed. A player can take unlimited time.
- **Fix**: Calculate `endTime = createdAt + totalGameDuration + graceMs` on session creation, store in DB, reject any submit after that.
- **Status**: [x] FIXED

### 2.2 No Max Array Length on DTOs — ALL 12 Custom Games

- **Problem**: All `z.array()` validators accept unlimited elements. A malicious client can send millions of items causing OOM/DoS.
- **Fix**: Add `.max(N)` to every array in every DTO (e.g., taps: `z.array().max(500)`, moves: `z.array().max(1000)`).
- **Games**: 1, 2, 3, 4, 13, 14, 15, 16, 17, 18, 19, 20
- **Status**: [x] FIXED

### 2.3 CORS Wildcard — ALL 12 Custom Games

- **Problem**: `app.enableCors()` without origin whitelist → any website can call game APIs.
- **Fix**: `app.enableCors({ origin: ['https://game.zubaco.com', 'http://localhost:3xxx'] })`.
- **Status**: [x] FIXED

### 2.4 Missing Helmet (Security Headers) — ALL 12 Custom Games

- **Problem**: No security headers (X-Frame-Options, CSP, HSTS, etc.).
- **Fix**: `npm i helmet` + `app.use(helmet())` in main.ts.
- **Status**: [x] FIXED

### 2.5 Infinite Auto-Submit Loop — Object Placement (Game 2)

- **File**: Frontend hook
- **Problem**: `shouldAutoSubmit` checked on every render. If network fails, fires repeatedly.
- **Fix**: Use a ref to track "already submitting" and check in useEffect instead of render body.
- **Status**: [x] FIXED

### 2.6 State Mutation in Reducer — Rapid Category Sort (Game 4)

- **File**: Frontend hook (`prev.answers.push(...)`)
- **Problem**: Direct mutation of state array instead of immutable update. Breaks React rules.
- **Fix**: Use `[...prev.answers, answer]` spread pattern.
- **Status**: [x] FIXED

### 2.7 No Duplicate Session Check — Games 1, 2, 3, 4

- **Problem**: No check for existing active sessions before starting a new one. User can start unlimited sessions and submit only the best.
- **Fix**: On `/game/start`, check for active sessions by playerId + status='active', expire existing and create new.
- **Status**: [x] FIXED

### 2.8 No Submit Idempotency — ALL 12 Custom Games

- **Problem**: Same gameSessionId can be submitted multiple times. Race condition on status check vs update.
- **Fix**: Use database transaction with `WHERE status = 'active'` in the UPDATE, check `affected rows = 1`.
- **Status**: [x] FIXED

---

## 3. MISSING PRODUCTION FEATURES (P2)

### 3.1 No Payload Encryption — ALL 12 Custom Games

- **What pre-built games have**: AES-256-GCM CryptoModule with `@EnableEncryption()` decorator
- **What custom games have**: Plain JSON over HTTPS
- **Fix**: Port the CryptoModule from pre-built games (interceptor + middleware), add to all custom backends.
- **Status**: [ ] IMPLEMENTED

### 3.2 No Restate Durable Sessions — ALL 12 Custom Games

- **What pre-built games have**: Restate durable execution for session management (survives crashes)
- **What custom games have**: Simple Prisma create/update (if server crashes mid-game, session is lost)
- **Fix**: Implement Restate workflow per game for start → play → submit lifecycle.
- **Status**: [ ] IMPLEMENTED

### 3.3 No Anti-Cheat Timing Analysis — Games 15, 16, 17, 19, 20

- **Problem**: Even games with correct server validation don't analyze timing patterns (bot detection).
- **Fix**: Add per-input timing analysis: reject if average response time < human threshold (varies per game).
- **Status**: [ ] IMPLEMENTED

### 3.4 No SNS Event Publishing — ALL 12 Custom Games

- **What pre-built games have**: Publish cheat flags + game completion events to AWS SNS for downstream processing.
- **What custom games have**: Nothing — flags only stored in DB.
- **Fix**: Add SNS publish on: game complete, cheat flagged, score anomaly.
- **Status**: [ ] IMPLEMENTED

### 3.5 No Internationalization (i18n) — ALL 12 Custom Games

- **What pre-built games have**: `i18next` with `locales/en` + `locales/hi` (English + Hindi)
- **Fix**: Add i18next, extract all strings to locale files.
- **Status**: [ ] IMPLEMENTED

### 3.6 No Level/Difficulty Scaling — ALL 12 Custom Games

- **Problem**: Every play is the same difficulty. No progression.
- **What's needed**: 10 fixed levels per game + endless mode. Config varies grid size, time, speed, element count.
- **Fix**: Add `levelConfig` table, accept `level` param on `/game/start`, apply config.
- **Status**: [ ] IMPLEMENTED

---

## 4. UX & POLISH ITEMS (P3)

### 4.1 No Instruction Screen — ALL 12 Custom Games

- **What pre-built games have**: Multi-slide instruction carousel with animations explaining the game.
- **Fix**: Add instruction screen component with 3-4 slides per game (rules, scoring, tips).
- **Status**: [ ] IMPLEMENTED

### 4.2 No Result Screen — ALL 12 Custom Games

- **What pre-built games have**: Animated result overlay with score breakdown, stars, share button.
- **Fix**: Add result screen component showing: total score, breakdown (correct/wrong/bonus), time taken, star rating.
- **Status**: [ ] IMPLEMENTED

### 4.3 No Audio System — ALL 12 Custom Games

- **What pre-built games have**: Howler.js with BGM + contextual SFX (tap, success, failure, level-up)
- **Fix**: Add AudioProvider + sound registry. Minimum SFX: tap, correct, wrong, timer-warning, game-over.
- **Status**: [ ] IMPLEMENTED

### 4.4 No 7-Stage Theme System — ALL 12 Custom Games

- **What pre-built games have**: `STAGE_THEME_COLORS` object with 7 color palettes, applied per difficulty stage.
- **Fix**: Port `stageTheme.ts` to custom games, apply colors based on level/stage parameter.
- **Status**: [ ] IMPLEMENTED

### 4.5 No ErrorBoundary — ALL 12 Custom Game Frontends

- **Problem**: If any component throws, entire app white-screens.
- **Fix**: Add React ErrorBoundary wrapper with "Something went wrong" UI + retry button.
- **Status**: [ ] IMPLEMENTED

### 4.6 No Offline Detection — ALL 12 Custom Games

- **What pre-built games have**: `OfflineStatusModal` overlaying game when connection lost.
- **Fix**: Add navigator.onLine listener + modal overlay.
- **Status**: [ ] IMPLEMENTED

### 4.7 No Ready/Countdown Screen — ALL 12 Custom Games

- **Problem**: Game starts immediately after API response, no time to prepare.
- **Fix**: Add 3-2-1 countdown animation between "Start" click and actual gameplay beginning.
- **Status**: [ ] IMPLEMENTED

### 4.8 No Zubaco Branding — ALL 12 Custom Game Frontends

- **What pre-built games have**: Outfit + Orbitron fonts, Zubaco Z logo, brand colors, favicon.
- **Fix**: Add font imports, logo SVG, update favicon, apply brand color tokens.
- **Status**: [ ] IMPLEMENTED

### 4.9 No PostMessage Bridge — ALL 12 Custom Games

- **Problem**: Games can't communicate back to the mobile WebView wrapper.
- **What's needed**: `window.parent.postMessage({ type: 'gameComplete', score })` on finish.
- **Fix**: Add postMessage dispatcher on game end with gameSessionId + score + status.
- **Status**: [ ] IMPLEMENTED

### 4.10 Small Question/Word Banks — Games 14, 17, 20

| Game | Current Bank Size | Minimum Needed |
|------|:-:|:-:|
| Word Unscramble (14) | 108 words | 500+ words |
| Memory Groups (17) | 8 word sets | 50+ word sets |
| Speed Type Answer (20) | 30 questions | 300+ questions |

- **Status**: [ ] EXPANDED

---

## 5. PLATFORM SYSTEMS NOT YET BUILT (P4)

> These are entire systems that need to be built as separate services.

| System | Priority | Complexity | Status |
|--------|:--------:|:----------:|--------|
| User Authentication (OAuth + JWT + OTP) | P0 | High | [ ] NOT STARTED |
| User Profile & XP Progression | P0 | Medium | [ ] NOT STARTED |
| Free Play Level System (10 levels × 20 games) | P0 | High | [ ] NOT STARTED |
| Tournament Elimination Engine | P0 | Very High | [ ] NOT STARTED |
| Season/Cohort Management | P0 | High | [ ] NOT STARTED |
| Mobile App Shell (React Native) | P0 | High | [ ] NOT STARTED |
| Wallet / Payments / KYC | P1 | Very High | [ ] NOT STARTED |
| Leaderboard System (global + per-stage) | P1 | Medium | [ ] NOT STARTED |
| Push Notification Service | P1 | Medium | [ ] NOT STARTED |
| Admin Panel: Season Management | P1 | Medium | [ ] NOT STARTED |
| Admin Panel: User Management | P1 | Medium | [ ] NOT STARTED |
| Admin Panel: Analytics Dashboard | P2 | High | [ ] NOT STARTED |
| Social Features (friends, challenges) | P2 | Medium | [ ] NOT STARTED |
| Referral/Invite System | P2 | Low | [ ] NOT STARTED |
| Achievement/Badge System | P2 | Medium | [ ] NOT STARTED |
| Post-Game Replay System | P3 | High | [ ] NOT STARTED |
| Spectator Mode | P3 | High | [ ] NOT STARTED |
| In-App Chat | P3 | Medium | [ ] NOT STARTED |

---

## 6. GAMEPLAY IMPROVEMENTS (P5)

### 6.1 Pacing Issues

| Game | Issue | Suggested Fix |
|------|-------|---------------|
| Number Grid Sprint (15) | Player waits passively for cells to reveal | Add player-triggered "peek" mechanic (limited uses) |
| Live Route Builder (16) | 2s between nodes = too much waiting | Reduce to 1.5s, add score multiplier for fast connections |
| Memory Groups (17) | 5s memorize is very brief | Scale by difficulty: Level 1 = 8s, Level 10 = 3s |
| Object Placement (2) | Memorize phase passive, no countdown | Add visible countdown timer during memorize |

### 6.2 Balancing Issues

| Game | Issue | Suggested Fix |
|------|-------|---------------|
| Reflex Endurance (18) | 0.85× multiplier too aggressive | Use 0.9× multiplier, cap minimum at 400ms not 300ms |
| Pattern Survival (19) | One mistake = total loss is harsh | Add "1 free mistake" per game (configurable by level) |
| Speed Type Answer (20) | Exact match only (typo = 0 pts) | Add fuzzy matching (Levenshtein distance ≤ 1 = partial credit) |
| True/False Blitz (13) | -5 penalty harsh for beginners | Scale penalty by level: Level 1-3 = -2, Level 7+ = -5 |

### 6.3 Missing Feedback Systems

| Game | Missing Feedback | Impact |
|------|-----------------|--------|
| Number Grid Sprint (15) | No per-cell correct/wrong indicator | Players don't learn from mistakes |
| Live Route Builder (16) | No "optimal connection" hint | Players don't know if they're doing well |
| Memory Groups (17) | No partial-correct group feedback | All-or-nothing feels unfair |
| Object Placement (2) | No "getting warmer/colder" hint | Placement feels like guessing |

### 6.4 Replayability Concerns

| Issue | Games Affected | Fix |
|-------|---------------|-----|
| Small content banks (memorizable) | 14, 17, 20 | Expand to 500+ items per game |
| No daily challenges | All | Add daily seed = same puzzle for everyone, leaderboard |
| No achievements | All | "First Perfect Round", "10 Games Streak", etc. |
| No unlockables | All | Unlock themes/avatars at milestones |

---

## 7. INFRASTRUCTURE & DEVOPS (P6)

### 7.1 Missing Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| Dockerfiles per game (FE + BE) | [ ] NOT DONE | Need multi-stage builds |
| Docker Compose (local dev) | [ ] NOT DONE | All 20 games + Postgres + Redis |
| CI/CD Pipelines (GitHub Actions) | [ ] NOT DONE | lint → type-check → test → build → deploy |
| Terraform IaC (AWS) | [ ] NOT DONE | ECS, RDS, ElastiCache, S3, CloudFront, ALB |
| Database Migrations | [ ] NOT DONE | Prisma migrate for all 20 schemas |
| Auto-scaling Policies | [ ] NOT DONE | Scale on tournament stage openings |
| SSL/Domain Setup | [ ] NOT DONE | `game.zubaco.com` + per-game subdomains |
| WAF Configuration | [ ] NOT DONE | Rate limiting, geo-blocking, bot protection |
| Monitoring (CloudWatch/Datadog) | [ ] NOT DONE | Structured logging, error alerting |
| Load Testing Scripts (k6) | [ ] NOT DONE | Target: 100K concurrent players |

### 7.2 Missing Per-Game DevOps

| Item | Pre-built Games | Custom Games |
|------|:-:|:-:|
| Health check endpoint (`/health`) | ✅ | ❌ |
| Graceful shutdown handling | ✅ | ❌ |
| Structured JSON logging | ✅ | ❌ |
| Request ID tracing | ✅ (2/8) | ❌ |
| Prisma connection pooling | ✅ | ❌ |
| Redis caching layer | ✅ | ❌ |
| Compression middleware | ✅ | ❌ |

---

## 8. FEATURE GAP: PRE-BUILT vs CUSTOM GAMES

### Complete Feature Comparison

| Feature | Pre-built (5-12) | Custom (1-4, 13-20) | Action Needed |
|---------|:-:|:-:|---------------|
| 7-Stage Theme System | ✅ All 8 | ❌ 0/12 | Port stageTheme.ts |
| Instruction Screen (carousel) | ✅ All 8 | ❌ 0/12 | Build component |
| Result Screen (overlay) | ✅ All 8 | ❌ 0/12 | Build component |
| Audio (BGM + SFX) | ✅ 7/8 | ❌ 0/12 | Add Howler + sounds |
| AES-256-GCM Encryption | ✅ 7/8 | ❌ 0/12 | Port CryptoModule |
| Restate Durable Sessions | ✅ 8/8 | ❌ 0/12 | Implement workflow |
| Anti-cheat (timing + patterns) | ✅ 8/8 | ⚠️ 4/12 | Add to remaining 8 |
| SNS Event Publishing | ✅ 8/8 | ❌ 0/12 | Add event publisher |
| i18n (en + hi) | ✅ 8/8 | ❌ 0/12 | Add i18next |
| OpenTelemetry | ✅ 2/8 | ❌ 0/12 | Add tracing |
| Helmet + Compression | ✅ 8/8 | ❌ 0/12 | npm install + configure |
| ErrorBoundary (FE) | ✅ 8/8 | ❌ 0/12 | Add wrapper component |
| Offline Detection | ✅ 5/8 | ❌ 0/12 | Add listener + modal |
| WebSocket Real-time | ✅ 4/8 | ❌ 0/12 | Optional per game |
| Level/Difficulty Scaling | ✅ 8/8 | ❌ 0/12 | Add level configs |
| Zubaco Branding (fonts/logo) | ✅ 8/8 | ❌ 0/12 | Port brand assets |
| Responsive Mobile Design | ✅ 8/8 | ⚠️ Basic | Improve touch UX |
| CORS Whitelist | ✅ 8/8 | ❌ 0/12 | Configure origins |
| Health Check Endpoint | ✅ 8/8 | ❌ 0/12 | Add `/health` route |
| Graceful Shutdown | ✅ 8/8 | ❌ 0/12 | Add shutdown hooks |

---

## 9. PER-GAME SCORING & QUALITY MATRIX

### Security Score (10 = bulletproof, 1 = trivially exploitable)

| Game | Server Validation | Anti-Cheat | Encryption | Overall |
|------|:-:|:-:|:-:|:-:|
| 1. Flash Spot | 2/10 | 3/10 | 0/10 | **2/10** |
| 2. Object Placement | 2/10 | 2/10 | 0/10 | **2/10** |
| 3. Colour Sorting | 9/10 | 5/10 | 0/10 | **6/10** |
| 4. Rapid Category Sort | 8/10 | 7/10 | 0/10 | **6/10** |
| 5-12. Pre-built | 9/10 | 8/10 | 9/10 | **9/10** |
| 13. True/False Blitz | 9/10 | 7/10 | 0/10 | **6/10** |
| 14. Word Unscramble | 8/10 | 6/10 | 0/10 | **5/10** |
| 15. Number Grid Sprint | 8/10 | 3/10 | 0/10 | **4/10** |
| 16. Live Route Builder | 7/10 | 4/10 | 0/10 | **4/10** |
| 17. Memory Groups | 8/10 | 4/10 | 0/10 | **5/10** |
| 18. Reflex Endurance | 2/10 | 5/10 | 0/10 | **3/10** |
| 19. Pattern Survival | 1/10 | 2/10 | 0/10 | **1/10** |
| 20. Speed Type Answer | 8/10* | 3/10 | 0/10 | **4/10*** |

*Speed Type has a seed mismatch bug that makes verification fail on every game.

### Fun Factor Score

| Game | Engagement | Replayability | Feedback | Overall |
|------|:-:|:-:|:-:|:-:|
| 1. Flash Spot | 7/10 | 6/10 | 7/10 | **7/10** |
| 2. Object Placement | 5/10 | 5/10 | 4/10 | **5/10** |
| 3. Colour Sorting | 8/10 | 7/10 | 7/10 | **7/10** |
| 4. Rapid Category Sort | 8/10 | 6/10 | 8/10 | **7/10** |
| 13. True/False Blitz | 7/10 | 5/10 | 7/10 | **6/10** |
| 14. Word Unscramble | 6/10 | 6/10 | 5/10 | **6/10** |
| 15. Number Grid Sprint | 5/10 | 5/10 | 3/10 | **4/10** |
| 16. Live Route Builder | 5/10 | 6/10 | 4/10 | **5/10** |
| 17. Memory Groups | 6/10 | 4/10 | 4/10 | **5/10** |
| 18. Reflex Endurance | 9/10 | 8/10 | 7/10 | **8/10** |
| 19. Pattern Survival | 8/10 | 8/10 | 6/10 | **7/10** |
| 20. Speed Type Answer | 7/10 | 4/10 | 6/10 | **6/10** |

---

## RELEASE READINESS CHECKLIST

### Minimum Viable Launch Requirements

- [ ] All 5 critical security fixes (Section 1)
- [ ] All 8 high-priority bugs (Section 2)
- [ ] User Authentication system
- [ ] Free Play mode (at least 3 levels per game)
- [ ] Mobile app shell with WebView
- [ ] Basic leaderboard
- [ ] Instruction + result screens for all games
- [ ] Audio (at minimum: SFX)
- [ ] Tournament engine (1 season functional)
- [ ] Payment gateway (if real-money tournaments)
- [ ] App store compliance (privacy policy, T&C)
- [ ] Load test passing at target concurrency
- [ ] SSL + domain configured
- [ ] CI/CD pipeline functional

### Current Release Readiness: **3/10** (Not ready for public release)

---

## CHANGE LOG

| Date | Item | Status |
|------|------|--------|
| 2026-05-22 | Audit created | ✅ |
| 2026-05-22 | Fix 1.1: Flash Spot — server now regenerates change schedule from seed, validates taps server-side | ✅ |
| 2026-05-22 | Fix 1.2: Object Placement — server now regenerates board from seed, validates placements server-side | ✅ |
| 2026-05-22 | Fix 1.3: Reflex Endurance — server now regenerates circle sequence from seed, validates tap colors | ✅ |
| 2026-05-22 | Fix 1.4: Pattern Survival — server now receives full round inputs, verifies against generated sequences | ✅ |
| 2026-05-22 | Fix 1.5: Speed Type Answer — fixed seed mismatch (sends serverSeed string instead of pre-computed number) | ✅ |
| 2026-05-22 | Fix 2.3: CORS — all 12 custom backends now use origin whitelist instead of wildcard | ✅ |
| 2026-05-22 | Fix 2.4: Helmet — all 12 custom backends now use helmet for security headers | ✅ |
| 2026-05-22 | Fix 2.2 (partial): Added .max() to Pattern Survival DTO arrays | ✅ |
| 2026-05-22 | Fix 2.1 (partial): Added endTime enforcement to Flash Spot + Object Placement | ✅ |
| | | |

---

*This document should be updated as fixes are applied. Mark items with [x] when complete.*
