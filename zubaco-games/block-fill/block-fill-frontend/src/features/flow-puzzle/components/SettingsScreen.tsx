import { ArrowLeft, Volume2, VolumeX, Vibrate, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAudio } from '@/audio';
import { useState } from 'react';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const audio = useAudio();
  const [vibration, setVibration] = useState(() => {
    try {
      return localStorage.getItem('blockfill_vibration') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleVibration = () => {
    const next = !vibration;
    setVibration(next);
    try {
      localStorage.setItem('blockfill_vibration', String(next));
    } catch { /* ignore */ }
  };

  const handleResetProgress = () => {
    if (window.confirm('Reset all progress? This cannot be undone.')) {
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('blockfill_'));
        keys.forEach((k) => localStorage.removeItem(k));
        window.location.reload();
      } catch { /* ignore */ }
    }
  };

  return (
    <Card className="rounded-[2rem] border-white/12 bg-slate-950/65">
      <CardContent className="space-y-6 px-6 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Settings</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
              Preferences
            </h2>
          </div>
          <Button
            variant="ghost"
            className="rounded-full text-slate-200 hover:bg-white/8"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back
          </Button>
        </div>

        <div className="space-y-3">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => audio.toggleMuted()}
            className="flex w-full items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/5 px-5 py-4 transition-colors hover:bg-white/8"
          >
            <div className="flex items-center gap-3">
              {audio.muted ? <VolumeX size={20} className="text-slate-400" /> : <Volume2 size={20} className="text-cyan-300" />}
              <span className="text-sm font-medium text-white">Sound Effects</span>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors ${audio.muted ? 'bg-slate-600' : 'bg-cyan-400'}`}>
              <div className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${audio.muted ? 'translate-x-0.5' : 'translate-x-[1.375rem]'}`} />
            </div>
          </button>

          {/* Vibration Toggle */}
          <button
            type="button"
            onClick={handleToggleVibration}
            className="flex w-full items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/5 px-5 py-4 transition-colors hover:bg-white/8"
          >
            <div className="flex items-center gap-3">
              <Vibrate size={20} className={vibration ? 'text-cyan-300' : 'text-slate-400'} />
              <span className="text-sm font-medium text-white">Vibration</span>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors ${vibration ? 'bg-cyan-400' : 'bg-slate-600'}`}>
              <div className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${vibration ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {/* Reset Progress */}
          <button
            type="button"
            onClick={handleResetProgress}
            className="flex w-full items-center justify-between rounded-[1.5rem] border border-red-500/20 bg-red-500/5 px-5 py-4 transition-colors hover:bg-red-500/10"
          >
            <div className="flex items-center gap-3">
              <RotateCcw size={20} className="text-red-400" />
              <span className="text-sm font-medium text-red-200">Reset All Progress</span>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
