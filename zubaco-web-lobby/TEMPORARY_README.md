# ⚠️ TEMPORARY - DEV WEB LOBBY

## What is this?

This is a **temporary development launcher** created to test all 20 ZUBACO games from a web browser during development. It is NOT the production web app.

## Why does it exist?

The real player-facing app is the React Native mobile app (`zubaco-mobile`). Since we cannot run the mobile app on this machine (no Android/iOS emulator), this simple HTML page lets us open and test individual games.

## What needs to happen later?

This entire `zubaco-web-lobby/` folder should be **deleted and replaced** with the actual production web frontend when it is built. The production version should:

- Match the mobile app's UI/UX exactly (responsive design)
- Use the same design system, branding, and animations
- Have proper authentication (OAuth, social login, etc.)
- Connect to the Platform API for game catalog, user profiles, leaderboards
- Load games in iframes or micro-frontend architecture
- Be a proper Next.js or similar SSR framework app

## When to remove?

Delete this folder once the production web frontend is ready. No other code depends on this folder.

---

**Created:** May 24, 2026  
**Purpose:** Dev/testing only  
**Port:** 3009
