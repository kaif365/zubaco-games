import { motion } from 'framer-motion';

interface Props {
  score: number;
  timeLeft: number;
  nodesVisible: number;
  totalNodes: number;
  level: number;
  combo: number;
  onPause: () => void;
  onMute: () => void;
}

export function GameHeader({ score, timeLeft, nodesVisible, totalNodes, level, combo, onPause, onMute }: Props) {
  const secs = Math.ceil(timeLeft / 1000);
  const isLowTime = secs <= 10;

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/50">
      <div className="flex items-center justify-between px-4 py-2.5 max-w-2xl mx-auto">
        {/* Left: Level + Score */}
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-bold text-blue-400">
            LVL {level}
          </span>
          <span className="text-sm font-bold text-white">{score}</span>
        </div>

        {/* Center: Combo + Nodes */}
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <motion.span
              key={combo}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs font-bold text-amber-400"
            >
              🔥 ×{combo}
            </motion.span>
          )}
          <span className="text-xs text-slate-400">{nodesVisible}/{totalNodes}</span>
        </div>

        {/* Right: Timer + Controls */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono font-bold ${isLowTime ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
            {secs}s
          </span>
          <button onClick={onMute} className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors" title="Toggle sound">
            🔊
          </button>
          <button onClick={onPause} className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors" title="Pause">
            ⏸️
          </button>
        </div>
      </div>
    </div>
  );
}
