// ─── Pre-Game Rules Screen ──────────────────────────────────────
// Shared "how to play" screen shown before every Zubaco game. Displays the
// game's objective + rule bullets alongside a 5–10s looping sample animation
// that demonstrates the core interaction. Used by GameShell's `instructions`
// phase so all 20 games get a consistent, branded onboarding screen.

import React, { useEffect, useState } from 'react';

// ─── Per-game rules registry ────────────────────────────────────

/** A demo "variant" selects which sample animation to render. */
export type DemoVariant =
  | 'sequence'
  | 'match'
  | 'tap'
  | 'sort'
  | 'fill'
  | 'maze'
  | 'slide'
  | 'rotate'
  | 'type'
  | 'choice';

export interface GameRules {
  title: string;
  objective: string;
  rules: string[];
  demo: DemoVariant;
}

/**
 * Rules keyed by GameType (see platform schema.prisma GameType enum). Kept in
 * the SDK so every game frontend renders identical, reviewed instructions.
 */
export const GAME_RULES: Record<string, GameRules> = {
  SEQUENCE_RECALL: {
    title: 'Sequence Recall',
    objective: 'Memorise the highlighted sequence, then repeat it in order.',
    rules: [
      'Watch the tiles light up one by one.',
      'Tap them back in the exact same order.',
      'Each correct round adds more steps.',
    ],
    demo: 'sequence',
  },
  MEMORY_CARD_MATCHING: {
    title: 'Memory Card Matching',
    objective: 'Flip cards two at a time and match every pair.',
    rules: [
      'Tap a card to reveal it.',
      'Find its matching pair before the timer ends.',
      'Fewer flips and faster time score higher.',
    ],
    demo: 'match',
  },
  FLASH_SPOT: {
    title: 'Flash Spot',
    objective: 'Spot the difference before time runs out.',
    rules: [
      'Compare the two images carefully.',
      'Tap each difference you find.',
      'Wrong taps and hints cost points.',
    ],
    demo: 'tap',
  },
  OBJECT_PLACEMENT_MEMORY: {
    title: 'Object Placement Memory',
    objective: 'Remember where each object sits, then place them back.',
    rules: [
      'Study the layout while it is shown.',
      'Drag each object to its original spot.',
      'Accurate placements score more.',
    ],
    demo: 'match',
  },
  SLIDING_PUZZLE: {
    title: 'Sliding Puzzle',
    objective: 'Slide the tiles to restore the correct order.',
    rules: [
      'Tap a tile next to the empty space to slide it.',
      'Arrange all tiles in order.',
      'Fewer moves remaining bonus = higher score.',
    ],
    demo: 'slide',
  },
  BLOCK_FILL: {
    title: 'Block Fill',
    objective: 'Fill every cell in one continuous path.',
    rules: [
      'Drag from the start to cover all cells.',
      'Do not cross your own path.',
      'Complete fast for a time bonus.',
    ],
    demo: 'fill',
  },
  COLOUR_SORTING: {
    title: 'Colour Sorting',
    objective: 'Sort the colours until each tube holds one shade.',
    rules: [
      'Tap a tube, then another to pour.',
      'You can only pour onto a matching colour.',
      'Solve it before time runs out.',
    ],
    demo: 'sort',
  },
  RAPID_CATEGORY_SORT: {
    title: 'Rapid Category Sort',
    objective: 'Swipe each item into its correct category, fast.',
    rules: [
      'An item appears in the centre.',
      'Swipe it toward the matching category.',
      'Speed and accuracy both count.',
    ],
    demo: 'sort',
  },
  MAZE_NAVIGATION: {
    title: 'Maze Navigation',
    objective: 'Reach the exit using the shortest route you can.',
    rules: [
      'Swipe to move through the maze.',
      'Find the exit before time runs out.',
      'The optimal path earns the top score.',
    ],
    demo: 'maze',
  },
  INFINITY_LOOP: {
    title: 'Infinity Loop',
    objective: 'Rotate the pieces until every line connects.',
    rules: [
      'Tap a piece to rotate it.',
      'Connect all pipes with no loose ends.',
      'Clear boards quickly for more points.',
    ],
    demo: 'rotate',
  },
  WORD_UNSCRAMBLE: {
    title: 'Word Unscramble',
    objective: 'Rearrange the letters to form the hidden word.',
    rules: [
      'Tap letters to build the word.',
      'Use the hint if you are stuck.',
      'Solve more words to score higher.',
    ],
    demo: 'type',
  },
  TRUE_FALSE_BLITZ: {
    title: 'True / False Blitz',
    objective: 'Answer as many true/false prompts as you can.',
    rules: [
      'Read each statement quickly.',
      'Tap True or False.',
      'Streaks boost your score.',
    ],
    demo: 'choice',
  },
  ARROWS: {
    title: 'Arrows',
    objective: 'Swipe in the direction each arrow points.',
    rules: [
      'An arrow flashes on screen.',
      'Swipe the matching direction.',
      'Reacting too early scores zero.',
    ],
    demo: 'tap',
  },
  LOGIC_REFLECTOR: {
    title: 'Logic Reflector',
    objective: 'Follow the rule and respond correctly.',
    rules: [
      'A rule sets which side to tap.',
      'Apply it to each prompt.',
      'Stay accurate as the pace rises.',
    ],
    demo: 'choice',
  },
  NUMBER_GRID_SPRINT: {
    title: 'Number Grid Sprint',
    objective: 'Tap the numbers in ascending order, fast.',
    rules: [
      'Find 1, then 2, then 3…',
      'Tap them in order across the grid.',
      'Finish quickly for the best score.',
    ],
    demo: 'sequence',
  },
  LIVE_ROUTE_BUILDER: {
    title: 'Live Route Builder',
    objective: 'Connect the stops with the most efficient route.',
    rules: [
      'Drag to link each stop.',
      'Avoid blocked tiles.',
      'Shorter routes score higher.',
    ],
    demo: 'maze',
  },
  MEMORY_GROUPS: {
    title: 'Memory Groups',
    objective: 'Find the groups of related items.',
    rules: [
      'Select items that belong together.',
      'Lock in a group to clear it.',
      'Solve all groups before time ends.',
    ],
    demo: 'match',
  },
  REFLEX_ENDURANCE: {
    title: 'Reflex Endurance',
    objective: 'React to targets for as long as you can.',
    rules: [
      'Tap targets the moment they appear.',
      'Missed targets end the run.',
      'Survive longer to score more.',
    ],
    demo: 'tap',
  },
  PATTERN_SURVIVAL: {
    title: 'Pattern Survival',
    objective: 'Repeat ever-growing patterns to survive.',
    rules: [
      'Watch the pattern grow each round.',
      'Repeat it without mistakes.',
      'One wrong move ends the run.',
    ],
    demo: 'sequence',
  },
  SPEED_TYPE_ANSWER: {
    title: 'Speed Type Answer',
    objective: 'Type the answer as fast as you can.',
    rules: [
      'Read the prompt.',
      'Type the correct answer.',
      'Speed and accuracy both score.',
    ],
    demo: 'type',
  },
};

const FALLBACK_RULES: GameRules = {
  title: 'How to Play',
  objective: 'Follow the on-screen prompts and score as high as you can.',
  rules: ['Read the prompts carefully.', 'Respond quickly and accurately.', 'Beat the clock for bonus points.'],
  demo: 'tap',
};

export function getGameRules(gameType: string): GameRules {
  return GAME_RULES[gameType] || FALLBACK_RULES;
}

// ─── Component ──────────────────────────────────────────────────

export interface RulesScreenProps {
  gameType: string;
  stage?: number;
  /** Called when the player is ready to begin. */
  onReady: () => void;
  /** Sample animation length in ms (clamped to 5–10s). Default 6000. */
  demoDurationMs?: number;
  /** Disable the Start button until the demo has played once. Default true. */
  gateStartOnDemo?: boolean;
}

export function RulesScreen({
  gameType,
  stage,
  onReady,
  demoDurationMs = 6000,
  gateStartOnDemo = true,
}: RulesScreenProps) {
  const rules = getGameRules(gameType);
  const duration = Math.min(10000, Math.max(5000, demoDurationMs));
  const [demoPlayed, setDemoPlayed] = useState(!gateStartOnDemo);

  useEffect(() => {
    if (demoPlayed) return;
    const t = setTimeout(() => setDemoPlayed(true), duration);
    return () => clearTimeout(t);
  }, [duration, demoPlayed]);

  return (
    <div style={styles.container}>
      <style>{KEYFRAMES}</style>

      {typeof stage === 'number' && stage > 0 && (
        <div style={styles.stageBadge}>Stage {stage}</div>
      )}

      <h1 style={styles.title}>{rules.title}</h1>
      <p style={styles.objective}>{rules.objective}</p>

      <div style={styles.demoWrap}>
        <SampleAnimation variant={rules.demo} durationMs={duration} />
        <div style={styles.demoLabel}>Sample</div>
      </div>

      <ul style={styles.rules}>
        {rules.rules.map((r, i) => (
          <li key={i} style={styles.ruleItem}>
            <span style={styles.bullet}>{i + 1}</span>
            {r}
          </li>
        ))}
      </ul>

      <button
        onClick={onReady}
        disabled={!demoPlayed}
        style={{ ...styles.startBtn, ...(demoPlayed ? {} : styles.startBtnDisabled) }}
      >
        {demoPlayed ? 'Start Game' : 'Watch the demo…'}
      </button>
    </div>
  );
}

// ─── Sample animation ───────────────────────────────────────────
// Lightweight, dependency-free CSS demos. Each variant loops for the demo
// duration and visually conveys the core interaction of its game family.

function SampleAnimation({ variant, durationMs }: { variant: DemoVariant; durationMs: number }) {
  const loop = `${Math.max(2, Math.round(durationMs / 1000 / 3))}s`;

  switch (variant) {
    case 'sequence':
    case 'tap':
      return (
        <div style={demoStyles.grid3}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...demoStyles.cell,
                animation: `zb-pulse ${loop} ease-in-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>
      );
    case 'match':
    case 'choice':
      return (
        <div style={demoStyles.row}>
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                ...demoStyles.card,
                animation: `zb-flip ${loop} ease-in-out ${i * 0.6}s infinite`,
              }}
            />
          ))}
        </div>
      );
    case 'sort':
    case 'fill':
      return (
        <div style={demoStyles.row}>
          {['#ef4444', '#3b82f6', '#10b981'].map((c, i) => (
            <div
              key={i}
              style={{
                ...demoStyles.chip,
                background: c,
                animation: `zb-slidein ${loop} ease-in-out ${i * 0.5}s infinite`,
              }}
            />
          ))}
        </div>
      );
    case 'maze':
      return (
        <div style={demoStyles.mazeTrack}>
          <div style={{ ...demoStyles.dot, animation: `zb-travel ${loop} linear infinite` }} />
        </div>
      );
    case 'slide':
      return (
        <div style={demoStyles.grid2}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                ...demoStyles.tile,
                animation: `zb-nudge ${loop} ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      );
    case 'rotate':
      return (
        <div style={{ ...demoStyles.pipe, animation: `zb-rotate ${loop} steps(4) infinite` }}>⌐</div>
      );
    case 'type':
      return (
        <div style={demoStyles.typeBox}>
          <span style={{ animation: `zb-caret 1s step-end infinite` }}>|</span>
          <span style={demoStyles.typeText}>WORD</span>
        </div>
      );
    default:
      return null;
  }
}

// ─── Styles ─────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes zb-pulse { 0%,100% { opacity: .25; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.05); background:#10b981; } }
@keyframes zb-flip { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(180deg); background:#3b82f6; } }
@keyframes zb-slidein { 0% { transform: translateY(8px); opacity:.4; } 50% { transform: translateY(-8px); opacity:1; } 100% { transform: translateY(8px); opacity:.4; } }
@keyframes zb-travel { 0% { left: 4%; top: 4%; } 33% { left: 80%; top: 4%; } 66% { left: 80%; top: 70%; } 100% { left: 4%; top: 70%; } }
@keyframes zb-nudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
@keyframes zb-rotate { 100% { transform: rotate(360deg); } }
@keyframes zb-caret { 50% { opacity: 0; } }
`;

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(160deg,#0a0a0f 0%,#14141f 100%)',
    padding: '1.5rem',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  stageBadge: {
    fontSize: '.75rem',
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: '#fbbf24',
    border: '1px solid rgba(251,191,36,.4)',
    borderRadius: '999px',
    padding: '.25rem .75rem',
    marginBottom: '.75rem',
  },
  title: { fontSize: '1.6rem', fontWeight: 800, margin: '0 0 .35rem' },
  objective: { fontSize: '.95rem', color: '#cbd5e1', textAlign: 'center', maxWidth: 360, margin: '0 0 1.25rem' },
  demoWrap: {
    position: 'relative',
    width: 180,
    height: 120,
    background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
    overflow: 'hidden',
  },
  demoLabel: {
    position: 'absolute',
    top: 6,
    right: 10,
    fontSize: '.6rem',
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  rules: { listStyle: 'none', padding: 0, margin: '0 0 1.5rem', maxWidth: 340, width: '100%' },
  ruleItem: { display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.9rem', color: '#e2e8f0', marginBottom: '.6rem' },
  bullet: {
    flex: '0 0 auto',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#10b981',
    color: '#06281d',
    fontSize: '.75rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    padding: '.9rem 3rem',
    background: '#10b981',
    color: '#04211a',
    border: 'none',
    borderRadius: '.85rem',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity .2s',
  },
  startBtnDisabled: { background: '#334155', color: '#94a3b8', cursor: 'not-allowed' },
};

const demoStyles: Record<string, React.CSSProperties> = {
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 },
  grid2: { display: 'flex', gap: 6 },
  row: { display: 'flex', gap: 10, alignItems: 'center' },
  cell: { width: 34, height: 34, borderRadius: 8, background: '#1e293b' },
  card: { width: 40, height: 54, borderRadius: 8, background: '#475569' },
  chip: { width: 26, height: 26, borderRadius: '50%' },
  tile: {
    width: 30,
    height: 30,
    borderRadius: 6,
    background: '#3b82f6',
    color: '#fff',
    fontSize: '.8rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mazeTrack: { position: 'relative', width: 140, height: 90, border: '2px solid #334155', borderRadius: 8 },
  dot: { position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#10b981' },
  pipe: { fontSize: '3rem', color: '#10b981', display: 'inline-block' },
  typeBox: { display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: '1.4rem', color: '#10b981' },
  typeText: { letterSpacing: '.15em' },
};
