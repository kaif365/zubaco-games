# 📱 Zubaco Mobile — Comprehensive Line-by-Line Audit Plan

> **Scope:** [zubaco-mobile/](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile)  
> **Total Files:** Exactly **36 files** (5,533 lines of code) indexed in `all_zubaco_mobile_files.txt`  
> **Technology Stack:** React Native `0.76.0`, React `18.3.1`, React Navigation `v7`, Zustand `v5`, TanStack React Query `v5`, React Native WebView `13.12.0`, React Native Biometrics, Push Notifications.  
> **Batch Strategy:** **4 Sequential Batches** (9 files per batch) organized by architectural layer and functional flow.  
> **Strict Mandate:** Every single file is inspected **line-by-line** for React Native lifecycle issues, memory leaks, secure storage of JWT tokens, bridge message parsing (`GameScreen.tsx`), biometric auth fallback, offline resilience, and network error handling. Any bugs found are resolved and committed immediately.

---

## 📌 Architectural Overview & Domain Breakdown

| Subsystem / Layer | Total Files | File Range | Description |
|---|:---:|:---:|---|
| **Core & Configurations** | 4 | 1–2, 5, 36 | Application root, dependencies, TypeScript config & game registry constants |
| **Contexts & Shared Components** | 4 | 3–4, 6–7 | Error boundary, update modals, session authentication context & offline state context |
| **Navigation Architecture** | 3 | 8–10 | Root stack, bottom tab navigator, and imperative navigation reference utilities |
| **Authentication & Onboarding** | 4 | 11–14 | Splash screen, onboarding slider, OTP verification, and login flows |
| **Gameplay & Compliance** | 2 | 15–16 | WebView React Native bridge (`GameScreen`) & KYC verification document upload screen |
| **Main App Features (Social & Discovery)** | 5 | 17–20, 22 | Home dashboard, Free-to-play arena, Leaderboards, Push notifications list, Referrals |
| **Main App Features (Economy & Account)** | 5 | 21, 23–26 | Real-money tournaments, Wallet balance/withdrawal, Profile, Settings & Support |
| **Infrastructure & Device Services** | 9 | 27–35 | Secure storage, Biometrics, Push notifications, Analytics, Crash reporting & Centralized API client |

---

## 📋 Detailed 4-Batch Roadmap

| Batch | File Range | Layer / Focus Area | File Count | Lines of Code | Status |
|:---:|:---:|---|:---:|:---:|:---:|
| **Batch 1** | Files 1–9 | **Core Entry, Configs, Contexts & Navigation**<br>App root, dependencies, ErrorBoundary, AppUpdateModal, game constants, AuthContext, OfflineContext, and Tab/Root navigators. | 9 | 626 | 🚀 Ready |
| **Batch 2** | Files 10–18 | **Navigation Ref, Auth Flow, Game Bridge & Discovery**<br>Navigation helpers, Splash, Onboarding, Login, OTP, Game WebView Bridge Screen, KYC verification, FreePlay and Home screens. | 9 | 936 | ⏳ Queued |
| **Batch 3** | Files 19–27 | **Social, Economy, Tournaments & Account Screens**<br>Leaderboards, Notifications, Profile, Referral, Settings, Support, Tournament Lobby, Wallet deposit/withdrawal, and Analytics logger. | 9 | 2,864 | ⏳ Queued |
| **Batch 4** | Files 28–36 | **Device Services, API Client, Security & Build Config**<br>Analytics events, Central API service (token refreshes, interceptors), Biometrics, Crash reporting, Global error handlers, Secure storage, Preferences, Push notifications, and tsconfig. | 9 | 1,107 | ⏳ Queued |

---

## 🔍 Line-by-Line Audit Standard & Verification Checklist

For each file across all 4 batches:

### 1. React Native Lifecycle & Performance
- Ensure all event listeners (`BackHandler`, `AppState`, `NetInfo`, `Dimensions`, orientation) are cleaned up in `useEffect` return blocks to prevent memory leaks.
- Verify heavy list components (`FlatList`, `SectionList`) implement `keyExtractor`, `getItemLayout`, `initialNumToRender`, `maxToRenderPerBatch`, and `removeClippedSubviews`.
- Guard against infinite re-renders from unmemoized callbacks or inline object references in hook dependencies.

### 2. WebView & Game Bridge Security (`GameScreen.tsx`)
- Inspect WebView `onMessage` handler: ensure strict JSON validation and source origin checks.
- Prevent prototype pollution and malicious payload injection from untrusted WebView scripts.
- Validate game completion callbacks, score transmission, and session token injection.

### 3. Authentication, Security & Storage
- Ensure sensitive auth tokens (access token, refresh token) are stored strictly in `react-native-keychain` / `react-native-encrypted-storage` or equivalent secure storage (`src/services/secureStorage.ts`), **never** in unencrypted `AsyncStorage`.
- Ensure biometric authentication (`react-native-biometrics`) includes proper fallbacks for devices without hardware sensors or enrolled credentials.
- Verify KYC documents and personal user data are sanitized and never written to raw device logs.

### 4. API Resilience & Offline Synchronization
- Inspect `src/services/api.ts`: verify automated JWT refresh interceptor with token queueing to prevent stampeding refreshes on concurrent 401s.
- Verify network timeout configurations, retry strategies, and exponential backoff.
- Verify `OfflineContext.tsx`: ensure the application handles offline status gracefully with informative banners and blocked transaction actions.

### 5. Type Safety & Error Handling
- Complete TypeScript typing (avoid `any` where strictly typed navigation props, route params, or API contracts are expected).
- Ensure global error handler (`globalErrorHandler.ts`) and `ErrorBoundary.tsx` capture unhandled promise rejections without crashing the React root.

---

## 📂 Complete File-by-File Manifest (Files 1–36)

### **Batch 1: Core Entry, Configs, Contexts & Navigation (Files 1–9)**
1. [App.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/App.tsx) — Main React Native entry point, provider composition & root setup (80 lines)
2. [package.json](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/package.json) — Dependencies, scripts & React Native version pinning (43 lines)
3. [src/components/AppUpdateModal.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/components/AppUpdateModal.tsx) — Forced/optional in-app update dialog (121 lines)
4. [src/components/ErrorBoundary.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/components/ErrorBoundary.tsx) — Top-level React error boundary and fallback UI (72 lines)
5. [src/constants/games.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/constants/games.ts) — Game catalogue, metadata, routes, categories & orientation settings (52 lines)
6. [src/contexts/AuthContext.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/contexts/AuthContext.tsx) — Authentication state, session restoration & login/logout state machine (167 lines)
7. [src/contexts/OfflineContext.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/contexts/OfflineContext.tsx) — Network connectivity watcher and offline sync indicator (50 lines)
8. [src/navigation/MainTabs.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/navigation/MainTabs.tsx) — Bottom navigation tabs (Home, Tournaments, FreePlay, Wallet, Profile) (39 lines)
9. [src/navigation/RootNavigator.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/navigation/RootNavigator.tsx) — Native stack navigator managing Auth vs App screens (87 lines)

### **Batch 2: Navigation Ref, Auth Flow, Game Bridge & Discovery (Files 10–18)**
10. [src/navigation/navigationRef.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/navigation/navigationRef.ts) — Imperative navigation container reference for background/push navigation (18 lines)
11. [src/screens/auth/LoginScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/auth/LoginScreen.tsx) — Phone number / social authentication screen (193 lines)
12. [src/screens/auth/OnboardingScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/auth/OnboardingScreen.tsx) — Welcome carousel for first-time app users (17 lines)
13. [src/screens/auth/OtpScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/auth/OtpScreen.tsx) — 6-digit SMS OTP verification screen with auto-read and resend timer (106 lines)
14. [src/screens/auth/SplashScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/auth/SplashScreen.tsx) — Animated splash screen and initial session bootstrapping (44 lines)
15. [src/screens/game/GameScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/game/GameScreen.tsx) — React Native WebView game runner and bidirectional postMessage bridge (181 lines)
16. [src/screens/kyc/KycScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/kyc/KycScreen.tsx) — Government ID upload, PAN card validation & KYC state management (268 lines)
17. [src/screens/main/FreePlayScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/FreePlayScreen.tsx) — Practice game arena with instant play and score history (198 lines)
18. [src/screens/main/HomeScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/HomeScreen.tsx) — Main dashboard, featured games, hero banners & wallet quick summary (111 lines)

### **Batch 3: Social, Economy, Tournaments & Account Screens (Files 19–27)**
19. [src/screens/main/LeaderboardScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/LeaderboardScreen.tsx) — Daily, weekly & all-time global player leaderboards (289 lines)
20. [src/screens/main/NotificationsScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/NotificationsScreen.tsx) — In-app notification center and promotional alerts (200 lines)
21. [src/screens/main/ProfileScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/ProfileScreen.tsx) — User avatar, gaming stats, win rate & account details (305 lines)
22. [src/screens/main/ReferralScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/ReferralScreen.tsx) — Referral code generation, invite sharing & reward tracking (219 lines)
23. [src/screens/main/SettingsScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/SettingsScreen.tsx) — Audio, haptics, dark/light theme, biometric toggle & privacy controls (338 lines)
24. [src/screens/main/SupportScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/SupportScreen.tsx) — Customer support FAQ, ticketing & live chat launch (180 lines)
25. [src/screens/main/TournamentScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/screens/main/TournamentScreen.tsx) — Competitive tournament lobby, entry fees, prize pools & brackets (504 lines)
26. [src/screens/main/WalletScreen.tsx](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-games/word-unscramble/word-unscramble-backend/src/app.module.ts) — Real-money deposit (UPI/cards), withdrawal to bank, transaction history (605 lines)
27. [src/services/analytics.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/analytics.ts) — Analytics tracker dispatching events to telemetry endpoints (54 lines)

### **Batch 4: Device Services, API Client, Security & Build Config (Files 28–36)**
28. [src/services/analyticsEvents.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/analyticsEvents.ts) — Standardized event names and tracking parameter definitions (47 lines)
29. [src/services/api.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/api.ts) — Core HTTP client, base URLs, auth token injection & refresh queue (579 lines)
30. [src/services/biometric.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/biometric.ts) — Fingerprint / FaceID authentication wrapper and hardware sensor detection (31 lines)
31. [src/services/crashReporting.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/crashReporting.ts) — Crash logging, device info capture & error telemetry (43 lines)
32. [src/services/globalErrorHandler.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/globalErrorHandler.ts) — JS runtime unhandled rejection & exception handlers (46 lines)
33. [src/services/preferences.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/preferences.ts) — Local user settings & UI preference store (61 lines)
34. [src/services/pushNotifications.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/pushNotifications.ts) — APNs/FCM token registration, channel creation & notification handler (122 lines)
35. [src/services/secureStorage.ts](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/src/services/secureStorage.ts) — Encrypted key-value store for JWTs and sensitive user credentials (40 lines)
36. [tsconfig.json](file:///c:/Users/Ashar/Desktop/zubaco-games/zubaco-mobile/tsconfig.json) — TypeScript compiler configuration for React Native (23 lines)
