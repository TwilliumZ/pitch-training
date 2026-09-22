import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeMonoWav, noteFromDetectedMidi, recognizePitch } from './pitchRecognition';

test('MIDI番号から表示対象の音符を取得する', () => {
  assert.equal(noteFromDetectedMidi(60)?.nameJa, 'ド');
  assert.equal(noteFromDetectedMidi(69)?.nameEn, 'A4');
  assert.equal(noteFromDetectedMidi(48)?.nameEn, 'C4');
  assert.equal(noteFromDetectedMidi(45)?.nameEn, 'A4');
});

test('PCMサンプルを有効なモノラルWAVに変換する', async () => {
  const wav = encodeMonoWav(new Float32Array([0, 1, -1]), 16_000);
  const bytes = new Uint8Array(await wav.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
  assert.equal(wav.size, 50);
});

test('オクターブ補正の境界と不正値を扱う', () => {
  assert.equal(noteFromDetectedMidi(72)?.nameEn, 'C5');
  assert.equal(noteFromDetectedMidi(84)?.nameEn, 'C5');
  assert.equal(noteFromDetectedMidi(73)?.midiNumber, 61);
  assert.equal(noteFromDetectedMidi(59)?.midiNumber, 71);
  assert.equal(noteFromDetectedMidi(NaN), null);
  assert.equal(noteFromDetectedMidi(Infinity), null);
});

test('音声解析APIの応答をそのまま返す', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ frequencyHz: 440, midiNumber: 69, noteName: 'A4', confidence: 0.9 }),
    { status: 200 },
  )) as typeof fetch;
  try {
    const result = await recognizePitch(new Blob(['x'], { type: 'audio/wav' }));
    assert.equal(result.midiNumber, 69);
    assert.equal(result.noteName, 'A4');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('APIのエラー詳細をそのまま表示する', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ detail: '声を検出できませんでした。' }),
    { status: 422 },
  )) as typeof fetch;
  try {
    await assert.rejects(
      recognizePitch(new Blob(['x'], { type: 'audio/wav' })),
      /声を検出できませんでした/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('不正な応答は受け付けない', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ frequencyHz: -1, midiNumber: 69, noteName: 'A4', confidence: 0.9 }),
    { status: 200 },
  )) as typeof fetch;
  try {
    await assert.rejects(recognizePitch(new Blob(['x'], { type: 'audio/wav' })), /不正な応答/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
