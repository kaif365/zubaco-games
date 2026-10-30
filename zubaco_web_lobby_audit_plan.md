# 📑 Zubaco Web Lobby Line-by-Line Audit & Verification Plan

This document establishes the line-by-line audit plan for the `zubaco-web-lobby` workspace folder. Following the same strict standard applied to `zubaco-games` (5,278 files across 106 batches) and `zubaco-mobile` (36 files across 4 batches), every file in `zubaco-web-lobby` is tracked, inspected line-by-line, and hardened against security, integration, and development gotchas.

---

## 📊 High-Level Metrics

| Metric | Detail |
|---|---|
| **Target Subsystem** | `zubaco-web-lobby/` (Dev Browser Launcher & Game Orchestrator) |
| **Total Source Files** | **3 files** |
| **Total Lines of Code** | **247 lines** |
| **Architecture** | Single-page HTML5 dev launcher, Vanilla JS + CSS, Web Cryptography API (`crypto.subtle`), Dev JWT Token Generator (HS256), Real-time Backend Health-Check Polling |
| **Port** | `3009` |
| **Target Endpoints** | Ports `3005`–`3136` (All 20 ZUBACO game frontends and backends) |
| **Batch Size** | 1 Focused Comprehensive Batch (Files 1–3) |

---

## 📋 Audit Batch Roadmap

| Batch | File Range | Layer / Focus Area | File Count | Lines of Code | Status |
|:---:|:---:|---|:---:|:---:|:---:|
| **Batch 1** | Files 1–3 | **Dev Launcher, Token Generator, Game Routes & Server Setup**<br>Web launcher page (`index.html`), scripts/dependencies (`package.json`), and developer docs (`TEMPORARY_README.md`). | 3 | 247 | 🚀 Ready |

---

## 🔍 Line-by-Line Audit Standard & Verification Checklist

For each file in `zubaco-web-lobby`:

### 1. Browser Cryptography & JWT Token Generation (`index.html`)
- Verify Web Crypto API `crypto.subtle.importKey` and `crypto.subtle.sign` implementations for HS256 JWT generation.
- Ensure token payload contains all necessary claims expected across game backends (`sub`, `userId`, `sessionId`, `gameType`, `mode`, `iat`, `exp`).
- Audit secret mapping (`JWT_SECRETS`) against all 20 game backend services to guarantee dev sessions authenticate successfully without signature verification failures.

### 2. Frontend & Backend Port Mapping
- Audit all 20 game entries in `GAMES` list against actual frontend port allocations (`3005`, `3011`, `3101`–`3135`) and backend ports (`3006`, `3012`, `3102`–`3136`).
- Verify health check polling (`checkHealth`) uses safe timeouts (`AbortSignal.timeout`) to prevent hung network connections when games are stopped.

### 3. Server Configuration & Local Execution (`package.json`)
- Ensure dev server command (`dev`) is cross-platform and reliable.
- Verify dependencies and scripts support local offline development.

---

## 📂 Complete File Manifest (Files 1–3)

### **Batch 1: Dev Launcher, Token Generator & Server Config (Files 1–3)**
1. [index.html](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-web-lobby/index.html) — Single-page HTML5 game launcher, dark UI, Web Crypto HMAC-SHA256 token generator & health poller (206 lines)
2. [package.json](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-web-lobby/package.json) — NPM package metadata and dev launcher serve script (10 lines)
3. [TEMPORARY_README.md](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-web-lobby/TEMPORARY_README.md) — Documentation describing purpose, architecture, and future migration plan (31 lines)

---

## 🔄 Tracking Log

| Date | Step | Action | Commit / Status |
|---|---|---|---|
| 2026-10-30 | Plan Created | Full inventory of `zubaco-web-lobby` verified (3 files, 247 lines) | 🚀 Ready to Execute |
