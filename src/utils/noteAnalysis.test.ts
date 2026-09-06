import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNotes } from './noteAnalysis';
import type { SavedAnswer, SavedResult } from './resultStorage';

const game = (answers?: SavedAnswer[], difficulty: SavedResult['difficulty'] = 'standard'): SavedResult => ({
  id: 'game', date: '2026-09-06T00:00:00Z', difficulty,
  totalScore: 100, questionCount: answers?.length ?? 5, perfectCount: 0, averageTimeSec: 2, answers,
});
const answer = (targetNoteId: string, chosenNoteId: string | null): SavedAnswer => ({ targetNoteId, chosenNoteId });

test('ranks by error rate, counts confusions, and keeps octaves and accidentals distinct', () => {
  const analysis = analyzeNotes([
    game([answer('C4', 'D4'), answer('C4', 'D4'), answer('C4', 'C4'), answer('C4', 'C4')]),
    game([answer('C5', 'C4'), answer('Cs4', 'D4'), answer('D4', 'D4')], 'advanced'),
  ]);
  assert.deepEqual(analysis.notes.map((s) => s.note.id), ['Cs4', 'C5', 'C4', 'D4']);
  const c = analysis.notes.find((s) => s.note.id === 'C4')!;
  assert.equal(c.errorRate, 0.5);
  assert.equal(c.attempts, 4);
  assert.equal(c.mistakes, 2);
  assert.deepEqual(c.confusedNotes.map((s) => [s.note.id, s.count]), [['D4', 2]]);
});

test('excludes legacy games and timeouts from error rates and confusions', () => {
  const analysis = analyzeNotes([game(), game([answer('C4', null), answer('D4', 'D4'), answer('D4', null)])]);
  assert.equal(analysis.analyzedGames, 1);
  assert.equal(analysis.legacyGames, 1);
  const c = analysis.notes.find((s) => s.note.id === 'C4')!;
  assert.equal(c.attempts, 0);
  assert.equal(c.timeouts, 1);
  assert.deepEqual(c.confusedNotes, []);
  assert.equal(analysis.notes.find((s) => s.note.id === 'D4')!.errorRate, 0);
  assert.deepEqual(analyzeNotes([]), { analyzedGames: 0, legacyGames: 0, notes: [] });
});

test('analyzes only supplied difficulty-filtered games', () => {
  const results = [game([answer('C4', 'D4')]), game([answer('Cs4', 'D4')], 'advanced')];
  assert.deepEqual(analyzeNotes(results.filter((r) => r.difficulty === 'standard')).notes.map((s) => s.note.id), ['C4']);
});
