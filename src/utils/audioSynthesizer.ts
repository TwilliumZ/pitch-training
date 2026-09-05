/**
 * Web Audio API synthesizer for realistic musical notes, SFX, and pitch detection.
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a musical note with rich acoustic harmonics (Piano / Celesta-like timbre).
 */
export function playNoteSound(freq: number, duration: number = 1.4, instrument: 'piano' | 'flute' | 'bell' = 'piano'): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.connect(ctx.destination);

    if (instrument === 'piano') {
      // Additive harmonics for piano resonance
      const harmonics = [
        { mult: 1, gain: 0.6 },
        { mult: 2, gain: 0.25 },
        { mult: 3, gain: 0.12 },
        { mult: 4, gain: 0.05 },
        { mult: 5, gain: 0.02 },
      ];

      harmonics.forEach(({ mult, gain }) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = mult === 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * mult, now);

        oscGain.gain.setValueAtTime(gain, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + duration);
      });

      // Master envelope
      masterGain.gain.exponentialRampToValueAtTime(0.7, now + 0.03); // quick attack
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else {
      // Bell / celesta style
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      masterGain.gain.setValueAtTime(0.6, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration);
    }
  } catch (err) {
    console.warn('Failed to play note audio:', err);
  }
}

/**
 * Play rewarding sound effects
 */
export function playSuccessChime(isPerfect: boolean = true): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = isPerfect ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25]; // C major arpeggio or A major
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  } catch (e) {
    console.warn(e);
  }
}

export function playNearMissChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [440, 493.88];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.55);
    });
  } catch (e) {
    console.warn(e);
  }
}

export function playComboStreakSound(streak: number): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const baseFreq = 440 * Math.pow(1.122, Math.min(streak, 5));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.25);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Autocorrelation algorithm for detecting pitch from microphone buffer.
 * Returns pitch in Hz, or -1 if no clear tone / too quiet.
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): { freq: number; rms: number } {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) {
    sumOfSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumOfSquares / SIZE);

  // Noise floor threshold
  if (rms < 0.015) {
    return { freq: -1, rms };
  }

  // Trim silence at boundaries
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmedBuf = buffer.slice(r1, r2);
  const c = new Float32Array(trimmedBuf.length).fill(0);

  for (let i = 0; i < trimmedBuf.length; i++) {
    for (let j = 0; j < trimmedBuf.length - i; j++) {
      c[i] = c[i] + trimmedBuf[j] * trimmedBuf[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) {
    d++;
  }

  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmedBuf.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;

  // Parabolic interpolation for fine tuning
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) {
    T0 = T0 - b / (2 * a);
  }

  const freq = sampleRate / T0;
  // Human vocal range filter: 65Hz to 1200Hz
  if (freq >= 65 && freq <= 1200) {
    return { freq, rms };
  }

  return { freq: -1, rms };
}

/**
 * Convert frequency (Hz) to nearest MIDI number and note name.
 */
export function frequencyToMidi(freq: number): { midi: number; cents: number } {
  const noteNum = 12 * (Math.log2(freq / 440)) + 69;
  const roundedMidi = Math.round(noteNum);
  const cents = Math.round((noteNum - roundedMidi) * 100);
  return { midi: roundedMidi, cents };
}
