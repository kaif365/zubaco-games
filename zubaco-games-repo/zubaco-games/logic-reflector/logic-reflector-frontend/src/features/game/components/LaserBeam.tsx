import type { BeamArm, BeamPoint } from '@/game/laserEngine';

interface Props {
  arms: BeamArm[];
  cellSize: number;
  rows: number;
  cols: number;
}

const BEAM_COLOR = '#00e5ff';
const BEAM_MID = '#29d9ff';
const BEAM_CORE = '#ffffff';
const BEND_EPSILON = 0.01;
const CORONA_WIDTH = 0.22;

function toPixels(point: BeamPoint, cellSize: number): BeamPoint {
  return { x: point.x * cellSize, y: point.y * cellSize };
}

function armPoints(arm: BeamArm, cellSize: number): string {
  return arm.points
    .map((point) => toPixels(point, cellSize))
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
}

function getOrigins(arms: BeamArm[], cellSize: number): BeamPoint[] {
  const seen = new Set<string>();
  const out: BeamPoint[] = [];
  for (const arm of arms) {
    const first = arm.points[0];
    if (!first) continue;
    const key = `${first.x.toFixed(3)},${first.y.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toPixels(first, cellSize));
  }
  return out;
}

function collectBendPoints(arms: BeamArm[], cellSize: number): BeamPoint[] {
  return arms.flatMap((arm) => {
    const bends: BeamPoint[] = [];
    for (let i = 1; i < arm.points.length - 1; i++) {
      const prev = arm.points[i - 1]!;
      const cur = arm.points[i]!;
      const next = arm.points[i + 1]!;
      const incoming = Math.atan2(cur.y - prev.y, cur.x - prev.x);
      const outgoing = Math.atan2(next.y - cur.y, next.x - cur.x);
      if (Math.abs(incoming - outgoing) > BEND_EPSILON) {
        bends.push(toPixels(cur, cellSize));
      }
    }
    return bends;
  });
}

export function LaserBeam({ arms, cellSize, rows, cols }: Props) {
  const width = cols * cellSize;
  const height = rows * cellSize;
  const bendPoints = collectBendPoints(arms, cellSize);
  const origins = getOrigins(arms, cellSize);

  if (arms.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="beam-corona" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="beam-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="orb-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="orb-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="35%" stopColor={BEAM_MID} stopOpacity="0.9" />
          <stop offset="100%" stopColor={BEAM_COLOR} stopOpacity="0" />
        </radialGradient>
      </defs>

      {arms.map((arm, index) => {
        if (arm.points.length < 2) return null;
        return (
          <polyline
            key={`corona-${index}`}
            points={armPoints(arm, cellSize)}
            fill="none"
            stroke={BEAM_COLOR}
            strokeWidth={cellSize * CORONA_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.13"
          />
        );
      })}

      {arms.map((arm, index) => {
        if (arm.points.length < 2) return null;
        return (
          <polyline
            key={`glow-${index}`}
            points={armPoints(arm, cellSize)}
            fill="none"
            stroke={BEAM_COLOR}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.46"
            filter="url(#beam-corona)"
          />
        );
      })}

      {arms.map((arm, index) => {
        if (arm.points.length < 2) return null;
        return (
          <polyline
            key={`mid-${index}`}
            points={armPoints(arm, cellSize)}
            fill="none"
            stroke={BEAM_MID}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="1"
            filter="url(#beam-glow)"
          />
        );
      })}

      {arms.map((arm, index) => {
        if (arm.points.length < 2) return null;
        return (
          <polyline
            key={`core-${index}`}
            points={armPoints(arm, cellSize)}
            fill="none"
            stroke={BEAM_CORE}
            strokeWidth="0.85"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="1"
          />
        );
      })}

      {bendPoints.map((point, index) => (
        <g key={`bend-${index}`} filter="url(#orb-glow)">
          <circle cx={point.x} cy={point.y} r={cellSize * 0.2} fill="url(#orb-grad)" />
          <circle cx={point.x} cy={point.y} r={cellSize * 0.07} fill="white" opacity="1" />
        </g>
      ))}

      {origins.map((point, index) => (
        <g key={`orig-${index}`} filter="url(#orb-glow)">
          <circle cx={point.x} cy={point.y} r={cellSize * 0.24} fill="url(#orb-grad)" opacity="0.75" />
          <circle cx={point.x} cy={point.y} r={cellSize * 0.08} fill="white" opacity="1" />
        </g>
      ))}
    </svg>
  );
}
