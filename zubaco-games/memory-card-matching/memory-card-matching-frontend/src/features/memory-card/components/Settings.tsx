import { useState, useEffect } from 'react';

// ─── Types & Storage ─────────────────────────────────────────────────────────

interface SettingsData {
  soundEnabled: boolean;
  volume: number;
  cardTheme: 'symbols' | 'colors' | 'jewels';
}

const STORAGE_KEY = 'memory-card-settings';

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { soundEnabled: true, volume: 80, cardTheme: 'symbols' };
}

function saveSettings(data: SettingsData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getSettings(): SettingsData {
  return loadSettings();
}

// ─── Component ───────────────────────────────────────────────────────────────

const THEMES: { value: SettingsData['cardTheme']; label: string; icon: string }[] = [
  { value: 'symbols', label: 'Symbols', icon: '♠' },
  { value: 'colors', label: 'Colors', icon: '🎨' },
  { value: 'jewels', label: 'Jewels', icon: '💎' },
];

interface SettingsProps {
  readonly onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', padding: '24px',
    }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Settings</h2>
        <div style={{ width: '50px' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '320px', margin: '0 auto', width: '100%', gap: '20px' }}>
        {/* Sound Toggle */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px', background: 'rgba(30,27,75,0.8)', padding: '16px 20px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fff' }}>Sound Effects</span>
          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            style={{
              width: '48px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: settings.soundEnabled ? '#3b82f6' : '#475569', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
              position: 'absolute', top: '4px', transition: 'transform 0.2s',
              transform: settings.soundEnabled ? 'translateX(24px)' : 'translateX(4px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        {/* Volume Slider */}
        <div style={{ width: '100%', borderRadius: '12px', background: 'rgba(30,27,75,0.8)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fff' }}>Volume</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{settings.volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume}
            onChange={(e) => setSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
            disabled={!settings.soundEnabled}
            style={{ width: '100%', accentColor: '#3b82f6', opacity: settings.soundEnabled ? 1 : 0.4 }}
          />
        </div>

        {/* Card Theme */}
        <div style={{ width: '100%', borderRadius: '12px', background: 'rgba(30,27,75,0.8)', padding: '16px 20px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fff', display: 'block', marginBottom: '12px' }}>Card Theme</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setSettings((s) => ({ ...s, cardTheme: theme.value }))}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  borderRadius: '10px', padding: '10px 8px', cursor: 'pointer',
                  border: settings.cardTheme === theme.value ? '2px solid #8b5cf6' : '1px solid rgba(71,85,105,0.4)',
                  background: settings.cardTheme === theme.value ? 'rgba(139,92,246,0.15)' : 'transparent',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{theme.icon}</span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
