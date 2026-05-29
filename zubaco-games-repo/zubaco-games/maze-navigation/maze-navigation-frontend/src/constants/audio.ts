const KENNEY_UI_AUDIO_BASE =
  "https://raw.githubusercontent.com/Calinou/kenney-ui-audio/master/addons/kenney_ui_audio";

export const MAZE_AUDIO_FILES = {
  bgm: "/audio/bgm.mp3",
  move: `${KENNEY_UI_AUDIO_BASE}/click3.wav`,
  pickSide: `${KENNEY_UI_AUDIO_BASE}/switch13.wav`,
  win: `${KENNEY_UI_AUDIO_BASE}/switch33.wav`,
  lose: `${KENNEY_UI_AUDIO_BASE}/switch7.wav`,
} as const;

export const MAZE_AUDIO_VOLUME = {
  bgm: 0.24,
  move: 0.95,
  pickSide: 0.9,
  win: 1,
  lose: 0.92,
} as const;
