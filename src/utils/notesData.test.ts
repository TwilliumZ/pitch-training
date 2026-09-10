import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AnswerResult, GameQuestion } from '../types';
import { ALL_NOTES, createMistakePracticeQuestions } from './notesData';

const question = (questionNumber: number): GameQuestion => ({
  id: `q-${questionNumber}`,
  questionNumber,
  targetNote: ALL_NOTES[questionNumber - 1],
  choices: [ALL_NOTES[questionNumber - 1], ALL_NOTES[3], ALL_NOTES[4], ALL_NOTES[5]],
  timeLimitSec: 10,
});

const answer = (questionNumber: number, isExact: boolean, rawInputText?: string): AnswerResult => ({
  questionNumber,
  targetNote: ALL_NOTES[questionNumber - 1],
  chosenNote: ALL_NOTES[questionNumber - 1],
  semitoneDiff: isExact ? 0 : 1,
  closenessScore: 0,
  speedBonus: 0,
  streakBonus: 0,
  totalRoundScore: 0,
  timeTakenSec: 1,
  isExact,
  streakCountAfter: 0,
  answeredVia: 'click',
  rawInputText,
});

test('誤答だけを出題順に抽出し、練習用の番号を振り直す', () => {
  const questions = [question(1), question(2), question(3)];
  const practice = createMistakePracticeQuestions(questions, [answer(1, true), answer(2, false), answer(3, false)]);

  assert.deepEqual(practice.map((q) => q.targetNote.id), [questions[1].targetNote.id, questions[2].targetNote.id]);
  assert.deepEqual(practice.map((q) => q.questionNumber), [1, 2]);
  assert.notEqual(practice[0].id, questions[1].id);
});

test('時間切れはフォールバック回答が一致していても練習対象にする', () => {
  const questions = [question(1)];
  const practice = createMistakePracticeQuestions(questions, [answer(1, true, '時間切れ')]);
  assert.equal(practice.length, 1);
});

test('全問正解または回答不足なら空の練習セットを返す', () => {
  const questions = [question(1), question(2)];
  assert.deepEqual(createMistakePracticeQuestions(questions, [answer(1, true)]), []);
});
