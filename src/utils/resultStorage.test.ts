import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getResults, saveResult } from './resultStorage';
import type { AnswerResult } from '../types';
import { ALL_NOTES } from './notesData';

let stored: Map<string, string>;
beforeEach(() => {
  stored = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
  } });
});
const answers = [
  { targetNote: ALL_NOTES[0], chosenNote: ALL_NOTES[0], isExact: true, timeTakenSec: 2 },
  { targetNote: ALL_NOTES[2], chosenNote: ALL_NOTES[0], isExact: false, timeTakenSec: 4 },
] as AnswerResult[];
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
  assert.deepEqual(results[0].answers, [
    { targetNoteId: 'C4', chosenNoteId: 'C4' },
    { targetNoteId: 'D4', chosenNoteId: 'C4' },
  ]);
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

test('legacy results remain readable when adding detailed results', () => {
  saveResult('old', 'standard', 100, answers);
  const legacy = getResults().map(({ answers: _, ...result }) => result);
  stored.set('pitch_master_results_v1', JSON.stringify(legacy));
  saveResult('new', 'advanced', 200, answers);
  assert.equal(getResults()[0].answers, undefined);
  assert.equal(getResults()[1].answers?.length, 2);
});

test('timeouts do not store the automatically selected choice as a player answer', () => {
  saveResult('timeout', 'standard', 0, [{ ...answers[0], rawInputText: '時間切れ' }]);
  assert.deepEqual(getResults()[0].answers, [{ targetNoteId: 'C4', chosenNoteId: null }]);
});

test('invalid answer details are rejected', () => {
  saveResult('valid', 'standard', 100, answers);
  const valid = getResults()[0];
  for (const details of [null, [], [{ targetNoteId: 'unknown', chosenNoteId: 'C4' }, valid.answers![1]], [null, null]]) {
    stored.set('pitch_master_results_v1', JSON.stringify([{ ...valid, answers: details }]));
    assert.throws(() => getResults());
  }
});
