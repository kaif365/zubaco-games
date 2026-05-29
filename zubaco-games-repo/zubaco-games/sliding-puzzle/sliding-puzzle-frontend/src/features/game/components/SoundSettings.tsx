'use client';

import { type CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SoundSystem } from '../hooks/useSoundSystem';

interface Props {
  sound: SoundSystem;
}

export default function SoundSettings({ sound }: Props) {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  // Close panel on outside click
  useEffect(() => {
    if (!showSettings) return;
    const close = () => { setShowSettings(false); };
    document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('pointerdown', close); };
  }, [showSettings]);

  const musicVol = sound.musicMultiplier;
  const sfxVol = sound.sfxMultiplier;

  return (
    <div style={{ position: 'relative' }}>
      {/* Settings gear button */}
      <button
        type="button"
        onPointerDown={(e) => { e.stopPropagation(); }}
        onClick={() => { setShowSettings((v) => !v); }}
        aria-label={t('settings.soundSettings')}
        className={`settings-toggle ${showSettings ? 'settings-toggle--open' : ''}`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {showSettings && (
        <div
          onPointerDown={(e) => { e.stopPropagation(); }}
          className="settings-panel"
        >
          <div className="settings-panel__ring" />
          <div className="settings-panel__title">{t('settings.soundSettings')}</div>

          {/* Music */}
          <div className="settings-panel__group">
            <div className="settings-panel__row">
              <span className="settings-panel__label">{t('settings.music')}</span>
              <span className="settings-panel__value">
                {musicVol === 0 ? t('settings.off') : `${String(Math.round(musicVol * 100))}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={musicVol}
              onChange={(e) => { sound.setMusicMultiplier(parseFloat(e.target.value)); }}
              className="gold-range"
              style={{ '--range-progress': `${String(Math.round(musicVol * 100))}%` } as CSSProperties}
            />
          </div>

          {/* SFX */}
          <div className="settings-panel__group">
            <div className="settings-panel__row">
              <span className="settings-panel__label">{t('settings.effects')}</span>
              <span className="settings-panel__value">
                {sfxVol === 0 ? t('settings.off') : `${String(Math.round(sfxVol * 100))}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sfxVol}
              onChange={(e) => { sound.setSfxMultiplier(parseFloat(e.target.value)); }}
              className="gold-range"
              style={{ '--range-progress': `${String(Math.round(sfxVol * 100))}%` } as CSSProperties}
            />
          </div>
        </div>
      )}
    </div>
  );
}
