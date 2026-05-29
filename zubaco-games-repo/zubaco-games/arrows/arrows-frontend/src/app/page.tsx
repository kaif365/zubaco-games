"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { GAME_EVENTS } from "@/game/gameTypes";
import { LEVELS } from "@/game/gameLevels";
import type { PhaserGameHandle } from "@/components/PhaserGame";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
});

const MAX_LIVES = 3;

export default function Home() {
  const gameRef = useRef<PhaserGameHandle>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [hints, setHints] = useState(3);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState<"playing" | "won" | "gameover">(
    "playing",
  );
  const [zoom, setZoom] = useState(0); // 0–100 slider value

  // ── listen to Phaser events ──────────────────────────────────────────────
  useEffect(() => {
    const onLoad = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setLevel(d.level);
      setLives(d.lives);
      setHints(d.hints || 3);
      setStatus("playing");
      if (d.zoom != null) setZoom(d.zoom);
    };
    const onLives = (e: Event) => setLives((e as CustomEvent).detail);
    const onHints = (e: Event) => setHints((e as CustomEvent).detail);
    const onWin = () => setStatus("won");
    const onGameOver = () => setStatus("gameover");
    // Phaser emits this whenever it resets the zoom (level load / resize).
    // We update the slider WITHOUT firing CMD_ZOOM back, avoiding a loop.
    const onZoomChanged = (e: Event) =>
      setZoom((e as CustomEvent).detail as number);

    window.addEventListener(GAME_EVENTS.LEVEL_LOAD, onLoad);
    window.addEventListener(GAME_EVENTS.LIVES, onLives);
    window.addEventListener(GAME_EVENTS.HINTS, onHints);
    window.addEventListener(GAME_EVENTS.WIN, onWin);
    window.addEventListener(GAME_EVENTS.GAMEOVER, onGameOver);
    window.addEventListener(GAME_EVENTS.ZOOM_CHANGED, onZoomChanged);
    return () => {
      window.removeEventListener(GAME_EVENTS.LEVEL_LOAD, onLoad);
      window.removeEventListener(GAME_EVENTS.LIVES, onLives);
      window.removeEventListener(GAME_EVENTS.HINTS, onHints);
      window.removeEventListener(GAME_EVENTS.WIN, onWin);
      window.removeEventListener(GAME_EVENTS.GAMEOVER, onGameOver);
      window.removeEventListener(GAME_EVENTS.ZOOM_CHANGED, onZoomChanged);
    };
  }, []);

  const retry = () => gameRef.current?.retry();
  const next = () => gameRef.current?.next();
  const goto = (i: number) => gameRef.current?.goto(i);
  const guides = () => gameRef.current?.guides();
  const hint = () => gameRef.current?.hint();

  return (
    <main
      className="flex flex-col h-screen bg-white overflow-hidden select-none"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Top HUD bar ── */}
      <header
        className="flex-shrink-0 relative flex items-center justify-center"
        style={{
          borderBottom: "1px solid #e5e7eb",
          paddingTop: "8px",
          paddingBottom: "8px",
          backgroundColor: "#ffffff",
          minHeight: "52px",
        }}
      >
        {/* Centered content */}
        <div className="flex flex-col items-center gap-1.5">
          <span
            style={{
              color: "#6366f1",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.01em",
            }}
          >
            Level {level}
          </span>

          {/* Hearts row */}
          <div className="flex items-center gap-1" style={{ height: "20px" }}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <span
                key={i}
                style={{
                  width: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  lineHeight: 1,
                  transition: "opacity 0.3s",
                }}
              >
                {i < lives ? (
                  "❤️"
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ flexShrink: 0 }}
                  >
                    <path
                      d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 14 21 12 21Z"
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth="1.8"
                    />
                  </svg>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Gear icon — top right */}
        <button
          onClick={() => {
            /* settings placeholder */
          }}
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            padding: "4px",
            borderRadius: "6px",
            lineHeight: 1,
            opacity: 0,
          }}
          aria-label="Settings"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* ── Phaser canvas ── */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ backgroundColor: "#ffffff" }}
      >
        <PhaserGame ref={gameRef} />
      </div>

      {/* ── Bottom toolbar ── */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-3 pb-4 pt-2"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Hint button with badge */}
        <button
          onClick={hint}
          style={{
            position: "relative",
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            backgroundColor: "#f3f4f6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            transition: "background 0.15s",
          }}
          aria-label="Hint"
          title="Hint"
        >
          💡
          <span
            style={{
              position: "absolute",
              bottom: "2px",
              right: "2px",
              background: "#6366f1",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {hints}
          </span>
        </button>

        {/* Zoom slider pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#f3f4f6",
            borderRadius: "999px",
            padding: "6px 12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {/* Minus / zoom out icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>

          <input
            type="range"
            min={0}
            max={100}
            value={zoom}
            onChange={(e) => {
              const val = Number(e.target.value);
              setZoom(val);
              gameRef.current?.setZoom(val);
            }}
            style={{
              WebkitAppearance: "none",
              appearance: "none",
              width: "100px",
              height: "6px",
              borderRadius: "3px",
              background: `linear-gradient(to right, #6366f1 ${zoom}%, #d1d5db ${zoom}%)`,
              outline: "none",
              cursor: "pointer",
            }}
            aria-label="Zoom"
          />

          {/* Plus / zoom in icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        {/* Guide / hashtag button */}
        <button
          onClick={guides}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            backgroundColor: "#f3f4f6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            transition: "background 0.15s",
          }}
          aria-label="Toggle guides"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
        </button>
      </div>

      {/* ── Win overlay ── */}
      {status === "won" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
              border: "1px solid #e5e7eb",
              padding: "36px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              textAlign: "center",
              minWidth: "260px",
            }}
          >
            <div
              style={{
                fontSize: "52px",
                animation: "bounce 0.8s infinite alternate",
              }}
            >
              🎉
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Level Clear!
            </h2>
            <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
              <button
                onClick={retry}
                style={{
                  padding: "10px 20px",
                  borderRadius: "999px",
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                ↺ Replay
              </button>
              {level < LEVELS.length && (
                <button
                  onClick={next}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "999px",
                    background: "#6366f1",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  Next →
                </button>
              )}
              {level >= LEVELS.length && (
                <span
                  style={{
                    color: "#f59e0b",
                    fontWeight: 600,
                    alignSelf: "center",
                  }}
                >
                  All done! 🏆
                </span>
              )}
            </div>
            {/* Level select dots */}
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              {LEVELS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goto(i)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    border: "none",
                    background: i + 1 === level ? "#6366f1" : "#f3f4f6",
                    color: i + 1 === level ? "#fff" : "#6b7280",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Game Over overlay ── */}
      {status === "gameover" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
              border: "1px solid #e5e7eb",
              padding: "36px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              textAlign: "center",
              minWidth: "260px",
            }}
          >
            <div style={{ fontSize: "52px" }}>💔</div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Out of Lives!
            </h2>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px" }}>
              Arrows that are blocked will reverse.
            </p>
            <button
              onClick={retry}
              style={{
                marginTop: "8px",
                padding: "10px 28px",
                borderRadius: "999px",
                background: "#6366f1",
                border: "none",
                color: "#fff",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Slider thumb styles */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(99,102,241,0.4);
          border: 2px solid #fff;
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid #fff;
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to   { transform: translateY(-10px); }
        }
        button:hover {
          opacity: 0.85;
        }
      `}</style>
    </main>
  );
}
