# Maze audio assets

Configured in `src/constants/audio.ts`. Playback via Howler in `src/hooks/use-maze-audio.ts`; game events in `src/types/maze-audio-events.ts`.

## Sources

| Key        | Source                                                                              | Notes                                      |
| ---------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| `bgm`      | `bgm.mp3` (local, `public/audio/`)                                                  | Looping background music, same-origin      |
| `move`     | [Kenney UI Audio](https://github.com/Calinou/kenney-ui-audio) `click3.wav` (remote) | Reserved; not fired per cell during travel |
| `pickSide` | Kenney `switch13.wav` (remote)                                                      | Direction change / junction turn           |
| `win`      | Kenney `switch33.wav` (remote)                                                      | Portal / goal reached (success)            |
| `lose`     | Kenney `switch7.wav` (remote)                                                       | Live failure phase                         |

BGM is served from `/audio/bgm.mp3` to avoid third-party CORS blocks. SFX use GitHub raw URLs (Kenney UI Audio, CC0).

## Runtime behavior

| Event / phase             | BGM               | SFX                                   |
| ------------------------- | ----------------- | ------------------------------------- |
| `PLAYING`                 | Loops             | —                                     |
| Turn (junction or corner) | Continues         | `pickSide` (`maze-audio-pick-side`)   |
| Portal / goal             | **Continues**     | `win` (`maze-audio-goal-reached`)     |
| `LOSE`                    | Stops             | `lose`                                |
| `WIN` (results path)      | Stops             | (goal sound already played at portal) |
| Sound toggle OFF          | Stops all Howls   | —                                     |
| Sound toggle ON           | Resumes per phase | Turn/goal events work again           |

Goal success is intentionally **mixed over** BGM: do not call `stopBgm()` before `playWin()` on portal reach.

## Volumes

See `MAZE_AUDIO_VOLUME` in `src/constants/audio.ts` (BGM ~0.24, SFX higher for clarity over music).
