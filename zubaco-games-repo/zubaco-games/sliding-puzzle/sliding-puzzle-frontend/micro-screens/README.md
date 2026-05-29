# Micro Screens

Ready-made **portrait** UI for your game flow: an instruction carousel per stage and success/failure result screens. Stages **1–4** each get matching artwork, colors, and copy hooks.

**Included**

- `GameInstructionsScreen` — swipeable how-to-play slides + primary actions
- `GameSuccessScreen` / `GameFailureScreen` — score, progress ring, continue
- Types under [`src/types/`](./src/types/) and theme colors in [`theme/colors.ts`](./theme/colors.ts)

---

## Try it in the browser (development only)

These URLs belong to **this repo’s Next.js app** so you can preview layouts locally. They are **not** meant as production routes—mount the components wherever your product needs them.

**1. Start the app** (from the repository root, not inside `micro-screens/`):

```bash
npm run dev
```

**2. Open a preview**

| Preview            | URL                                                   | Defined in                                                        |
| ------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Instructions       | `/` · add `?stage=2` (any stage `1`–`4`, default `1`) | [`src/app/page.tsx`](../src/app/page.tsx)                         |
| Success or failure | `/result-test` · see query params below               | [`src/app/result-test/page.tsx`](../src/app/result-test/page.tsx) |

**Result test query params** (all optional):

- `variant` — `success` (default) or `failure`
- `stage` — `1` through `4`
- `score`, `completed`, `total` — numbers (defaults kick in if omitted)

```text
http://localhost:3000/?stage=3
http://localhost:3000/result-test
http://localhost:3000/result-test?variant=failure&stage=2&score=90
```

Use whatever port your dev server prints; `3000` is only an example.

---

## Setup

### 1. Carousel dependency

The instruction screen uses **Embla Carousel**. Install it next to your app’s `package.json` (workspace root here), not only inside `micro-screens`:

```bash
npm install embla-carousel-react
```

React is expected already (Next.js provides it). Match `embla-carousel-react` to your React major; this repo targets **v8.x**.

### 2. TypeScript path alias

Imports use `@micro-screens/*`. In the **project root** [`tsconfig.json`](../tsconfig.json):

```json
"paths": {
  "@/*": ["./src/*"],
  "@micro-screens/*": ["./micro-screens/*"]
}
```

**Examples**

- `@micro-screens/src` → [`micro-screens/src/index.ts`](./src/index.ts)
- `@micro-screens/theme/colors` → [`theme/colors.ts`](./theme/colors.ts)
- `@micro-screens/assets/...` → files under [`assets/`](./assets/)

Copying `micro-screens` elsewhere? Add the same `paths` mapping (or your bundler’s equivalent) so `@micro-screens/*` resolves to that folder.

---

## Instruction screen

Import [`GameInstructionsScreen`](./src/section/instructions/instructions-screen.tsx) from `@micro-screens/src`.

**Props**

- **`stage`** — `1` \| `2` \| `3` \| `4`: picks overlay, palette, and `{stage}` in labels
- **`contentByStage`** — optional partial map merged onto defaults (shape: [`StageContent`](./src/types/instruction-content.ts): titles, labels, `slides` → `items`)
- **`onPlayNow`** / **`onLearnHowToPlay`** — optional callbacks `(stage) => void`
- **`className`** — optional wrapper class

```tsx
import { GameInstructionsScreen } from "@micro-screens/src";
import type { StageInstructionContentMap } from "@micro-screens/src";

const contentByStage: Partial<StageInstructionContentMap> = {
  1: {
    gameLabel: "GAME {stage}",
    statusLabel: "ACTIVE",
    gameTitle: "Your title",
    slides: [
      {
        items: [
          /* … */
        ],
      },
    ],
  },
};

<GameInstructionsScreen
  stage={1}
  contentByStage={contentByStage}
  onPlayNow={(s) => {}}
  onLearnHowToPlay={(s) => {}}
/>;
```

---

## Result screens

Import [`GameSuccessScreen`](./src/section/results/game-result-screen.tsx) or [`GameFailureScreen`](./src/section/results/game-result-screen.tsx) from `@micro-screens/src`. Props are the same except the variant is baked into the component.

**Props**

- **`stage`** — theme, icons, overlays
- **`score`** — number shown in the hero
- **`completedGames`** / **`totalGames`** — progress label + ring
- **`contentByStage`** — optional copy overrides ([`ResultScreenLabels`](./src/types/result-content.ts))
- **`onContinue`** — optional `(stage) => void`
- **`className`** — optional wrapper class

```tsx
import { GameFailureScreen, GameSuccessScreen } from "@micro-screens/src";

playerWon ? (
  <GameSuccessScreen
    stage={1}
    score={250}
    completedGames={4}
    totalGames={4}
    contentByStage={optionalCopyFromApi}
    onContinue={() => router.push("/next")}
  />
) : (
  <GameFailureScreen
    stage={1}
    score={110}
    completedGames={1}
    totalGames={4}
    onContinue={() => router.push("/retry")}
  />
);
```

---

## Theme

[`theme/colors.ts`](./theme/colors.ts) exports **`STAGE_THEME_COLORS`** plus **`StageId`** / **`StageThemeColor`**. Each stage defines **`background`**, **`eclipse`**, and **`resultAccent`** for surfaces and the result-screen accents / ring.

---

## Folder map

- **Instructions UI** — `src/section/instructions/`
- **Results UI** — `src/section/results/`
- **Shared types** — `src/types/`
- **Demo defaults** — `src/mocks/` (safe to remove once the app passes real content)
- **Public API** — [`src/index.ts`](./src/index.ts)

---

## Moving past demo copy

[`src/mocks/config.ts`](./src/mocks/config.ts) and exports like **`INSTRUCTION_CONTENT_CONFIG`** exist for quick wiring only.

When everything comes from your backend or game state:

1. Stop importing mock config from app code.
2. Delete or empty [`src/mocks/config.ts`](./src/mocks/config.ts) when nothing references it.
3. Keep [`src/types/instruction-content.ts`](./src/types/instruction-content.ts)—that file is the contract, not a mock.
4. Trim [`src/index.ts`](./src/index.ts) so unused mock exports disappear.

Full typings for props live beside each component under [`src/types/game-instructions-screen.ts`](./src/types/game-instructions-screen.ts) and [`src/types/game-result-screen.ts`](./src/types/game-result-screen.ts).
