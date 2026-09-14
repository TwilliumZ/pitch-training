import { ALL_NOTES } from './notesData';
import type { NoteInfo } from '../types';

export interface PitchRecognitionResult {
  frequencyHz: number;
  midiNumber: number;
  noteName: string;
  confidence: number;
}

export function noteFromDetectedMidi(midiNumber: number): NoteInfo | null {
  if (!Number.isFinite(midiNumber)) return null;
  let normalizedMidi = Math.round(midiNumber);
  while (normalizedMidi < 60) normalizedMidi += 12;
  while (normalizedMidi > 72) normalizedMidi -= 12;
  return ALL_NOTES.find((note) => note.midiNumber === normalizedMidi) ?? null;
}

export async function recognizePitch(wav: Blob, signal?: AbortSignal): Promise<PitchRecognitionResult> {
  const body = new FormData();
  body.append('audio', wav, 'answer.wav');
  const response = await fetch('/api/pitch', { method: 'POST', body, signal });
  const payload = await response.json().catch(() => null) as (PitchRecognitionResult & { detail?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.detail || '音声を解析できませんでした。もう一度お試しください。');
  }
  if (!payload || !Number.isFinite(payload.midiNumber) || !Number.isFinite(payload.frequencyHz)) {
    throw new Error('音声解析サーバーから不正な応答が返されました。');
  }
  return payload;
}

export function encodeMonoWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const normalized = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff, true);
  });
  return new Blob([buffer], { type: 'audio/wav' });
}
