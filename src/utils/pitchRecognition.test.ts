import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeMonoWav, noteFromDetectedMidi } from './pitchRecognition';

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
