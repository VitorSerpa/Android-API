/**
 * Generates the bundled meditation sounds (RF-27) so the app works fully
 * offline without third-party audio licences:
 *   assets/audio/meditation-ambient.wav — a soft 20 s drone that loops seamlessly
 *   assets/audio/bell.wav               — a gentle bell for the end of a session
 * Run with `node scripts/generate-audio.mjs`. Replace them with recorded
 * guided meditations whenever you have them.
 */
import fs from 'node:fs';
import path from 'node:path';

const RATE = 22050;
const outDir = path.join(import.meta.dirname, '..', 'assets', 'audio');
fs.mkdirSync(outDir, { recursive: true });

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((value, index) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), index * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// Ambient: every partial completes whole cycles in 20 s, so the loop has no click.
const LOOP = 20;
const partials = [
  [110, 0.22, 0.05],
  [165, 0.14, 0.1],
  [220, 0.1, 0.15],
  [277.5, 0.05, 0.05],
  [330, 0.04, 0.1],
];
const ambient = Array.from({ length: RATE * LOOP }, (_, i) => {
  const t = i / RATE;
  return partials.reduce((sum, [frequency, gain, lfo]) => {
    const swell = 0.75 + 0.25 * Math.sin(2 * Math.PI * lfo * t);
    return sum + gain * swell * Math.sin(2 * Math.PI * frequency * t);
  }, 0) * 0.6;
});

// Bell: a few inharmonic partials with exponential decay.
const BELL = 3;
const bell = Array.from({ length: RATE * BELL }, (_, i) => {
  const t = i / RATE;
  const attack = Math.min(1, t / 0.01);
  return (
    attack *
    (0.5 * Math.exp(-t * 1.6) * Math.sin(2 * Math.PI * 528 * t) +
      0.25 * Math.exp(-t * 2.4) * Math.sin(2 * Math.PI * 1056 * t) +
      0.15 * Math.exp(-t * 3.5) * Math.sin(2 * Math.PI * 1427 * t)) *
    0.7
  );
});

fs.writeFileSync(path.join(outDir, 'meditation-ambient.wav'), wav(ambient));
fs.writeFileSync(path.join(outDir, 'bell.wav'), wav(bell));
console.log('Áudios gerados em', outDir);
