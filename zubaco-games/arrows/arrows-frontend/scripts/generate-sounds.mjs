/**
 * Generate minimal WAV sound effects for the arrows game.
 * Run with: node scripts/generate-sounds.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SAMPLE_RATE = 44100;
const publicDir = join(import.meta.dirname, '..', 'public');

function createWav(samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }
  return buffer;
}

function sine(freq, duration, volume = 0.5, fadeOut = true) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = fadeOut ? Math.max(0, 1 - t / duration) : 1;
    samples[i] = Math.sin(2 * Math.PI * freq * t) * volume * envelope;
  }
  return samples;
}

function noise(duration, volume = 0.3, fadeOut = true) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const envelope = fadeOut ? Math.max(0, 1 - i / numSamples) : 1;
    samples[i] = (Math.random() * 2 - 1) * volume * envelope;
  }
  return samples;
}

function chirp(freqStart, freqEnd, duration, volume = 0.5) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;
    const freq = freqStart + (freqEnd - freqStart) * progress;
    const envelope = Math.max(0, 1 - progress * 0.8);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * volume * envelope;
  }
  return samples;
}

function mix(...arrays) {
  const maxLen = Math.max(...arrays.map(a => a.length));
  const result = new Float64Array(maxLen);
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      result[i] += arr[i];
    }
  }
  return result;
}

function concat(...arrays) {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Float64Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// === Generate sounds ===

const sounds = {
  // Tap - short click
  'audio/arrows/arrow-tap.wav': sine(800, 0.06, 0.4),

  // Correct - pleasant ascending ding
  'audio/arrows/arrow-correct.wav': concat(sine(523, 0.08, 0.5), sine(659, 0.08, 0.5), sine(784, 0.12, 0.4)),

  // Incorrect - harsh buzz
  'audio/arrows/arrow-incorrect.wav': mix(sine(150, 0.2, 0.4), sine(180, 0.2, 0.3), noise(0.2, 0.15)),

  // Combo - exciting ascending
  'audio/arrows/combo.wav': concat(sine(523, 0.06, 0.4), sine(659, 0.06, 0.4), sine(784, 0.06, 0.4), sine(1047, 0.15, 0.5)),

  // UI click
  'audio/shared/ui-click.wav': sine(1000, 0.04, 0.3),

  // UI back
  'audio/shared/ui-back.wav': chirp(600, 300, 0.1, 0.3),

  // Level complete - happy ascending fanfare
  'audio/arrows/level-complete.wav': concat(
    sine(523, 0.12, 0.5), sine(659, 0.12, 0.5),
    sine(784, 0.12, 0.5), sine(1047, 0.25, 0.6)
  ),

  // Game over - descending sad tone
  'audio/arrows/game-over.wav': concat(sine(400, 0.2, 0.4), sine(300, 0.2, 0.4), sine(200, 0.4, 0.3)),

  // Countdown - single beep
  'audio/arrows/countdown.wav': sine(880, 0.1, 0.4),

  // Timer warning - urgent beep
  'audio/arrows/timer-warning.wav': concat(sine(1200, 0.08, 0.5), new Float64Array(Math.floor(SAMPLE_RATE * 0.05)), sine(1200, 0.08, 0.5)),

  // Hint - soft chime (keeping for backward compat)
  'audio/arrows/hint.wav': sine(1320, 0.15, 0.3),

  // Undo - whoosh down
  'audio/arrows/undo.wav': chirp(800, 400, 0.12, 0.35),

  // Star - sparkle
  'audio/arrows/star.wav': concat(sine(1047, 0.05, 0.4), sine(1319, 0.05, 0.4), sine(1568, 0.1, 0.3)),
};

// Write files
for (const [relativePath, samples] of Object.entries(sounds)) {
  const fullPath = join(publicDir, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('\\') > -1 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, createWav(Array.from(samples)));
  console.log(`✓ ${relativePath} (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
}

console.log('\nDone! All sound files generated.');
