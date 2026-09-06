import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getResults, saveResult } from './resultStorage';
import type { AnswerResult } from '../types';

let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
  } });
});
const answers = [{ isExact: true, timeTakenSec: 2 }, { isExact: false, timeTakenSec: 4 }] as AnswerResult[];
test('new history is empty and completed games persist in play order', () => {
  assert.deepEqual(getResults(), []);
  saveResult('first', 'advanced', 1234, answers);
  saveResult('second', 'standard', 500, answers);
  const results = getResults();
  assert.deepEqual(results.map((r) => r.id), ['first', 'second']);
  assert.equal(results[0].difficulty, 'advanced');
  assert.equal(results[0].perfectCount, 1);
  assert.equal(results[0].questionCount, 2);
  assert.equal(results[0].averageTimeSec, 3);
  assert.equal(results[0].totalScore, 1234);
});
test('retry does not duplicate a saved game', () => {
  saveResult('same', 'standard', 100, answers);
  saveResult('same', 'standard', 100, answers);
  assert.equal(getResults().length, 1);
});
test('corrupt data is reported without overwriting it', () => {
  stored.set('pitch_master_results_v1', '{broken');
  assert.throws(() => getResults());
  assert.throws(() => saveResult('new', 'standard', 0, answers));
  assert.equal(stored.get('pitch_master_results_v1'), '{broken');
});
test('malformed result fields are rejected', () => {
  stored.set('pitch_master_results_v1', JSON.stringify([{ id: 'bad', totalScore: '100' }]));
  assert.throws(() => getResults());
});
test('storage write failure is reported and can be retried', () => {
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => saveResult('retry', 'standard', 0, answers));
  localStorage.setItem = original;
  saveResult('retry', 'standard', 0, answers);
  assert.equal(getResults().length, 1);
});
