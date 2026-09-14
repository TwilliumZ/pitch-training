import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundResultBreakdown } from './RoundResultBreakdown';
import { ALL_NOTES } from '../utils/notesData';
import type { AnswerResult } from '../types';

function renderResult(overrides: Partial<AnswerResult> = {}) {
  const result: AnswerResult = {
    questionNumber: 1, targetNote: ALL_NOTES[0], chosenNote: ALL_NOTES[0],
    semitoneDiff: 0, closenessScore: 1000, speedBonus: 0, streakBonus: 0,
    totalRoundScore: 1000, timeTakenSec: 3, isExact: true,
    streakCountAfter: 1, answeredVia: 'click', ...overrides,
  };
  return renderToStaticMarkup(createElement(RoundResultBreakdown, {
    result, currentTotalScore: 1000, onNextQuestion: () => {}, isLastQuestion: false,
  }));
}

test('クリック回答では選んだ音として表示する', () => {
  const html = renderResult();
  assert.match(html, /選んだ音/);
  assert.doesNotMatch(html, /発声した音|あなたの声|認識信頼度/);
});

test('歌唱回答では補正と認識信頼度を表示する', () => {
  const html = renderResult({ answeredVia: 'voice_singing', pitchConfidence: 0.82 });
  assert.match(html, /発声した音（オクターブ補正後）/);
  assert.match(html, /認識信頼度 82%/);
  assert.match(html, /正解確率ではありません/);
});

test('信頼度のない過去の歌唱回答も表示できる', () => {
  assert.doesNotMatch(renderResult({ answeredVia: 'voice_singing' }), /認識信頼度|NaN/);
});

test('時間切れには回答の五線譜と認識信頼度を表示しない', () => {
  const html = renderResult({ answeredVia: 'voice_singing', rawInputText: '時間切れ', pitchConfidence: 0.82 });
  assert.match(html, /未回答/);
  assert.doesNotMatch(html, /楽譜で音程を比較|認識信頼度/);
});
