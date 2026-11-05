import { motion } from 'framer-motion';
import {
  Zap,
  Layers,
  Lock,
  Calendar,
  Trophy,
  BarChart3,
  Settings as SettingsIcon,
  BrainCircuit,
} from 'lucide-react';
import type { ElementType } from 'react';

export type AppPhase = 'menu' | 'daily' | 'achievements' | 'stats' | 'settings' | 'game';

interface MenuScreenProps {
  onNavigate: (phase: AppPhase) => void;
}

interface MenuButtonConfig {
  label: string;
  subtitle: string;
  phase?: AppPhase;
  color: string;
  icon: ElementType;
  badge?: string;
  disabled?: boolean;
}

const MENU_BUTTONS: MenuButtonConfig[] = [
  {
    label: 'Play Survival Mode',
    subtitle: '60s Time Attack • High Score',
    phase: 'game',
    color: 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600',
    icon: Zap,
  },
  {
    label: 'Play Campaign Mode',
    subtitle: '10 Levels • Progression & Stars',
    badge: 'Coming Soon',
    disabled: true,
    color: 'from-indigo-950/80 to-slate-900/80 border-indigo-500/20',
    icon: Layers,
  },
  {
    label: 'Daily Challenge',
    subtitle: 'New Daily Pattern',
    phase: 'daily',
    color: 'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600',
    icon: Calendar,
  },
  {
    label: 'Achievements',
    subtitle: 'Badges & Milestones',
    phase: 'achievements',
    color: 'from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600',
    icon: Trophy,
  },
  {
    label: 'Statistics',
    subtitle: 'Performance & History',
    phase: 'stats',
    color: 'from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600',
    icon: BarChart3,
  },
  {
    label: 'Settings',
    subtitle: 'Audio, Language & Controls',
    phase: 'settings',
    color: 'from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700',
    icon: SettingsIcon,
  },
];

export function MenuScreen({ onNavigate }: MenuScreenProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <motion.div
        className="flex flex-col items-center gap-2 mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2">
          <BrainCircuit size={32} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Sequence Recall</h1>
        <p className="text-gray-400 text-sm max-w-xs">
          Watch, remember, and repeat the pattern under pressure
        </p>
      </motion.div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {MENU_BUTTONS.map((btn, i) => {
          const IconComponent = btn.icon;
          return (
            <motion.button
              key={btn.label}
              onClick={() => btn.phase && !btn.disabled && onNavigate(btn.phase)}
              disabled={btn.disabled}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-gradient-to-r ${btn.color} text-white shadow-lg transition-all border border-white/10 ${
                btn.disabled ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: btn.disabled ? 0.7 : 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileTap={btn.disabled ? {} : { scale: 0.98 }}
            >
              <div className="flex items-center gap-3.5 text-left">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 text-white">
                  <IconComponent size={20} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm tracking-wide text-white">
                      {btn.label}
                    </span>
                    {btn.badge && (
                      <span className="rounded-full bg-indigo-500/30 border border-indigo-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        {btn.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/70 font-normal">
                    {btn.subtitle}
                  </span>
                </div>
              </div>
              {btn.disabled ? (
                <Lock size={15} className="text-white/40" />
              ) : (
                <span className="text-white/40 text-sm font-semibold">›</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
