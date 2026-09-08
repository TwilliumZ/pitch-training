import { GameDifficulty, GameQuestion, NoteInfo } from '../types';
import { ALL_NOTES } from './notesData';

export interface Melody {
  id: string;
  title: string;
  titleEn: string;
  bars: number[][]; // 1小節 = MIDI番号の配列
  memo: string;
}

function midi(m: number): NoteInfo {
  const n = ALL_NOTES.find((x) => x.midiNumber === m);
  if (!n) throw new Error(`melody midi out of range: ${m}`);
  return n;
}

/**
 * 協力モード用メロディー3曲（パブリックドメイン・白鍵のみ）
 * - 対戦=単音 / 協力=メロディー限定 の住み分け
 * - 1回流しで耳コピ → 1小節ごとに交代で選択肢解答
 */
export const MELODIES: Melody[] = [
  {
    id: 'kirakira',
    title: 'きらきら星',
    titleEn: 'Twinkle Twinkle',
    bars: [
      [60, 60, 67, 67],
      [69, 69, 67],
      [65, 65, 64, 64],
      [62, 62, 60],
    ],
    memo: 'ドドソソ ララソ〜',
  },
  {
    id: 'choucho',
    title: 'ちょうちょう',
    titleEn: 'Choucho',
    bars: [
      [64, 64, 62, 64],
      [60, 60, 62, 64],
      [64, 62, 62, 60],
      [62, 60, 60],
    ],
    memo: 'ミミレミ ドドレミ〜',
  },
  {
    id: 'mary',
    title: 'メリーさんのひつじ',
    titleEn: "Mary Had a Little Lamb",
    bars: [
      [64, 62, 60, 62],
      [64, 64, 64],
      [62, 62, 62],
      [64, 67, 67],
    ],
    memo: 'ミレドレ ミミミ〜',
  },
];

export function getMelodyById(id: string): Melody {
  return MELODIES.find((m) => m.id === id) ?? MELODIES[0];
}

export function flattenMelody(melody: Melody): number[] {
  return melody.bars.flat();
}

/** noteIndex(0始まり) → barIndex */
export function barIndexOfNote(melody: Melody, noteIndex: number): number {
  let acc = 0;
  for (let b = 0; b < melody.bars.length; b++) {
    acc += melody.bars[b].length;
    if (noteIndex < acc) return b;
  }
  return melody.bars.length - 1;
}

/** barIndex → 開始noteIndex */
export function noteStartOfBar(melody: Melody, barIndex: number): number {
  let acc = 0;
  for (let b = 0; b < barIndex; b++) acc += melody.bars[b].length;
  return acc;
}

/**
 * メロディーをGameQuestion列に変換（各音=1問、順番固定・耳コピ用）
 */
export function melodyToQuestions(melody: Melody, difficulty: GameDifficulty = 'standard'): GameQuestion[] {
  const pool = difficulty === 'standard' ? ALL_NOTES.filter((n) => !n.isAccidental) : ALL_NOTES;
  return flattenMelody(melody).map((m, i) => {
    const target = midi(m);
    const others = pool.filter((n) => n.id !== target.id);
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [target, ...distractors].sort(() => Math.random() - 0.5);
    return {
      id: `m_${melody.id}_${i + 1}`,
      questionNumber: i + 1,
      targetNote: target,
      choices,
      timeLimitSec: 10,
    };
  });
}
