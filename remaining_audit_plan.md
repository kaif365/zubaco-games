# 📑 Master Audit & Verification Plan: Remaining Repository Components

This document establishes the official line-by-line audit and verification plan for all remaining operational and backend components of the **ZUBACO** repository. Following the completion of `zubaco-games` (5,278 files / 106 batches), `zubaco-mobile` (36 files / 4 batches), `zubaco-web-lobby` (3 files / 1 batch), and `zubaco-admin-panel-repo` (425 files), this plan tracks the final **230 files** to achieve **100% total repository certification**.

---

## 📊 High-Level Metrics

| Metric | Detail |
|---|---|
| **Remaining Scope** | `zubaco-platform` (Core API) + DevOps, Infra, Redis, Ngrok, CI/CD & Root Automation |
| **Total Files to Audit** | **230 files** |
| **Component Breakdown** | `zubaco-platform`: **196 files**<br>DevOps, Infra, Redis, Ngrok, CI/CD: **34 files** |
| **Batch Structure** | **10 Sequential Batches** (~20–25 files per batch) |
| **Primary Frameworks** | NestJS 10, Prisma ORM, PostgreSQL, Redis, Razorpay SDK, Docker, GitHub Actions |

---

## 📋 10-Batch Master Roadmap

| Batch | File Range | Layer / Focus Area | File Count | Target Subsystem | Status |
|:---:|:---:|---|:---:|---|:---:|
| **Batch 1** | Files 1–25 | **Platform Core Engine & Database Schema**<br>Root configs, Prisma schema, migrations, common interceptors, exception filters, guards, and logging. | 25 | `zubaco-platform` (Core & DB) | ✅ **COMPLETED** (`3774de2`) |
| **Batch 2** | Files 26–50 | **Identity, Auth & User Management**<br>OTP delivery, Google/Apple OAuth, JWT strategies, refresh token queueing, and user profile management. | 25 | `zubaco-platform/src/auth` & `users` | ✅ **COMPLETED** (`3774de2`) |
| **Batch 3** | Files 51–75 | **Compliance, Legal, Admin & Social Systems**<br>PAN/Aadhaar KYC validation, state gaming bans, age checks, admin RBAC, push notifications & referral social graph. | 25 | `zubaco-platform/src/compliance`, `admin`, `social`, `notification` | ✅ **COMPLETED** (`3774de2`) |
| **Batch 4** | Files 76–100 | **Financial Engine, Wallet, Razorpay & Taxes**<br>Double-entry ledger, balance locks, deposits, withdrawal OTP verification, 30% TDS, GST, and webhook signatures. | 25 | `zubaco-platform/src/wallet`, `webhook`, `events` | ✅ **COMPLETED** (`3774de2`) |
| **Batch 5** | Files 101–125 | **Game Sessions, Free Play & Scoring Engine**<br>Session token minting, state machines, heartbeats, anti-replay, energy regeneration, progress sync & score calculations. | 25 | `zubaco-platform/src/game-session`, `free-play`, `scoring` | ✅ **COMPLETED** (`3774de2`) |
| **Batch 6** | Files 126–150 | **Fair Play, Anti-Cheat, RNG & Leaderboards**<br>Timing anomaly heuristics, bot detection, cryptographic RNG seeds, Redis sorted sets leaderboards & tournament bucketing. | 25 | `zubaco-platform/src/anti-cheat`, `rng`, `leaderboard`, `tournament` (pt 1) | ✅ **COMPLETED** (`037db84`) |
| **Batch 7** | Files 151–175 | **Tournament Elimination Engine & Database Seeds**<br>Multi-stage elimination trees, prize distribution, database seeds, migration scripts & initial test suites. | 25 | `zubaco-platform/src/tournament` (pt 2), `scripts/`, `test/` (pt 1) | ✅ **COMPLETED** (`037db84`) |
| **Batch 8** | Files 176–196 | **Platform E2E Test Suite & API Verification**<br>End-to-end test runners, integration specs, mock fixtures, and platform bootstrap verification. | 21 | `zubaco-platform/test/` (pt 2) | ✅ **COMPLETED** (`037db84`) |
| **Batch 9** | Files 197–215 | **DevOps, Docker & Cloud Infrastructure**<br>Dockerfiles for all 20 game backends/frontends, Kubernetes manifests, terraform scripts & root compose services. | 19 | `docker/`, `infrastructure/`, `docker-compose.yml` | ✅ **COMPLETED** (`037db84`) |
| **Batch 10** | Files 216–230 | **Redis Cache, Ngrok, GitHub Actions CI & Root Scripts**<br>Redis configurations/scripts, Ngrok tunnels, GitHub Actions CI/CD workflows & root utility scripts. | 15 | `redis/`, `ngrok/`, `.github/`, root scripts | ✅ **COMPLETED** (`037db84`) |
| **ALL BATCHES** | **Files 1–230** | **Full zubaco-platform, DevOps, Cloud Infra & CI/CD Audited Line-by-Line** | **230** | **Full Scope** | 🏆 **100% COMPLETE** |

---

## 🔍 Line-by-Line Audit Standard & Verification Checklist

For each file across all 10 batches:

### 1. Platform Security & Financial Integrity (`zubaco-platform`)
- **Ledger Invariants:** Ensure all wallet mutations (`credit`, `debit`, `lock`) use database transactions with strict row-level locking (`SELECT ... FOR UPDATE`) to prevent race conditions or double-spends.
- **TDS & GST Compliance:** Verify mandatory 30% TDS withholding on net winnings and correct GST deductions.
- **Webhook Authenticity:** Ensure Razorpay payment webhooks verify HMAC-SHA256 signatures before crediting user balances, with idempotency guards against replay attacks.
- **State Bans:** Verify compliance engine blocks cash games and withdrawals for restricted Indian states (e.g., Assam, Odisha, Telangana, Andhra Pradesh, Nagaland, Sikkim).

### 2. Fair Play, Game Sessions & Anti-Cheat
- **Session Tokens:** Ensure game session tokens are signed with HMAC-SHA256, strictly time-bounded, and tied to user ID and level config.
- **Score Anti-Tampering:** Verify score submissions are validated against maximum theoretical scores and minimum feasible completion times.
- **Deterministic RNG:** Confirm seed generation uses CSPRNG (`crypto.randomBytes`).

### 3. Containerization, DevOps & CI/CD
- **Docker Build Isolation:** Ensure multi-stage Docker builds discard devDependencies and sensitive build arguments.
- **Environment Parity:** Verify environment variable validation (`env.validation.ts`) prevents container boot with default or missing secrets in production.
- **CI/CD Resiliency:** Audit GitHub Actions workflow jobs for caching, branch protections, and deployment triggers.

---

## 🔄 Tracking Log

| Date | Step | Action | Commit / Status |
|---|---|---|---|
| 2026-10-30 | Master Plan Created | Full inventory of 230 remaining files mapped across 10 batches | 🚀 Ready to Execute Batch 1 |
| 2026-10-30 | Batches 1–5 Verified | Audited line-by-line, bound AllExceptionsFilter, hardened JWT config, untracked binary dumps, verified core schema, auth, compliance, wallet & session lifecycle | ✅ COMPLETED (`3774de2`) |
| 2026-10-30 | Batches 6–10 Verified | Audited line-by-line, made generate-audio/save-progress paths dynamic, verified tournaments, test suite, Docker, Terraform & CI/CD workflows | 🏆 **100% COMPLETE** (`037db84`) |
