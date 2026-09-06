import { GameDifficulty, GameQuestion, NoteInfo } from '../types';

export const ALL_NOTES: NoteInfo[] = [
  {
    id: 'C4',
    nameJa: 'ド',
    nameEn: 'C4',
    solfege: 'Do',
    octave: 4,
    midiNumber: 60,
    frequency: 261.63,
    isAccidental: false,
    color: '#ef4444', // Red
    voiceKeywords: ['ド', 'ど', 'どー', 'シー', 'c', 'c4', 'do', '一番', '1番', '1', 'a'],
  },
  {
    id: 'Cs4',
    nameJa: 'ド♯',
    nameEn: 'C#4',
    solfege: 'Do#',
    octave: 4,
    midiNumber: 61,
    frequency: 277.18,
    isAccidental: true,
    color: '#f97316', // Orange-red
    voiceKeywords: ['ドシャープ', 'ドのシャープ', 'どしゃーぷ', 'cシャープ', 'c#'],
  },
  {
    id: 'D4',
    nameJa: 'レ',
    nameEn: 'D4',
    solfege: 'Re',
    octave: 4,
    midiNumber: 62,
    frequency: 293.66,
    isAccidental: false,
    color: '#f97316', // Orange
    voiceKeywords: ['レ', 'れ', 'れー', 'ディー', 'd', 'd4', 're', '二番', '2番', '2', 'b'],
  },
  {
    id: 'Ds4',
    nameJa: 'レ♯',
    nameEn: 'D#4',
    solfege: 'Re#',
    octave: 4,
    midiNumber: 63,
    frequency: 311.13,
    isAccidental: true,
    color: '#eab308', // Amber
    voiceKeywords: ['レシャープ', 'レのシャープ', 'れしゃーぷ', 'dシャープ', 'd#'],
  },
  {
    id: 'E4',
    nameJa: 'ミ',
    nameEn: 'E4',
    solfege: 'Mi',
    octave: 4,
    midiNumber: 64,
    frequency: 329.63,
    isAccidental: false,
    color: '#eab308', // Yellow
    voiceKeywords: ['ミ', 'み', 'みー', 'イー', 'e', 'e4', 'mi', '三番', '3番', '3', 'c'],
  },
  {
    id: 'F4',
    nameJa: 'ファ',
    nameEn: 'F4',
    solfege: 'Fa',
    octave: 4,
    midiNumber: 65,
    frequency: 349.23,
    isAccidental: false,
    color: '#22c55e', // Green
    voiceKeywords: ['ファ', 'ふぁ', 'ふぁー', 'エフ', 'f', 'f4', 'fa', '四番', '4番', '4', 'd'],
  },
  {
    id: 'Fs4',
    nameJa: 'ファ♯',
    nameEn: 'F#4',
    solfege: 'Fa#',
    octave: 4,
    midiNumber: 66,
    frequency: 369.99,
    isAccidental: true,
    color: '#10b981', // Emerald
    voiceKeywords: ['ファシャープ', 'ファのシャープ', 'ふぁしゃーぷ', 'fシャープ', 'f#'],
  },
  {
    id: 'G4',
    nameJa: 'ソ',
    nameEn: 'G4',
    solfege: 'Sol',
    octave: 4,
    midiNumber: 67,
    frequency: 392.0,
    isAccidental: false,
    color: '#06b6d4', // Cyan
    voiceKeywords: ['ソ', 'そ', 'そー', 'ジー', 'g', 'g4', 'sol', 'so', '五番', '5番'],
  },
  {
    id: 'Gs4',
    nameJa: 'ソ♯',
    nameEn: 'G#4',
    solfege: 'Sol#',
    octave: 4,
    midiNumber: 68,
    frequency: 415.3,
    isAccidental: true,
    color: '#3b82f6', // Blue-light
    voiceKeywords: ['ソシャープ', 'ソのシャープ', 'そしゃーぷ', 'gシャープ', 'g#'],
  },
  {
    id: 'A4',
    nameJa: 'ラ',
    nameEn: 'A4',
    solfege: 'La',
    octave: 4,
    midiNumber: 69,
    frequency: 440.0,
    isAccidental: false,
    color: '#3b82f6', // Blue
    voiceKeywords: ['ラ', 'ら', 'らー', 'エー', 'a', 'a4', 'la'],
  },
  {
    id: 'As4',
    nameJa: 'ラ♯',
    nameEn: 'A#4',
    solfege: 'La#',
    octave: 4,
    midiNumber: 70,
    frequency: 466.16,
    isAccidental: true,
    color: '#8b5cf6', // Violet
    voiceKeywords: ['ラシャープ', 'ラのシャープ', 'らしゃーぷ', 'aシャープ', 'a#'],
  },
  {
    id: 'B4',
    nameJa: 'シ',
    nameEn: 'B4',
    solfege: 'Si',
    octave: 4,
    midiNumber: 71,
    frequency: 493.88,
    isAccidental: false,
    color: '#a855f7', // Purple
    voiceKeywords: ['シ', 'し', 'しー', 'ティー', 'ビー', 'b', 'b4', 'si', 'ti'],
  },
  {
    id: 'C5',
    nameJa: '高いド',
    nameEn: 'C5',
    solfege: 'High Do',
    octave: 5,
    midiNumber: 72,
    frequency: 523.25,
    isAccidental: false,
    color: '#ec4899', // Pink
    voiceKeywords: ['高いド', 'たかいど', 'ハイシー', 'c5'],
  },
];

export const NATURAL_NOTES = ALL_NOTES.filter((n) => !n.isAccidental);

/**
 * Generate 5 questions for a single game.
 * 4 choices per question, always including the target note.
 */
export function generateGameQuestions(difficulty: GameDifficulty = 'standard'): GameQuestion[] {
  const pool = difficulty === 'standard' ? NATURAL_NOTES : ALL_NOTES;
  const questions: GameQuestion[] = [];

  // Shuffle pool to pick 5 target notes
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  const targetNotes = shuffledPool.slice(0, TOTAL_QUESTIONS);

  targetNotes.forEach((target, index) => {
    // Pick 3 distinct distractor notes
    const otherNotes = pool.filter((n) => n.id !== target.id);
    const shuffledOthers = [...otherNotes].sort(() => Math.random() - 0.5);
    const distractors = shuffledOthers.slice(0, 3);

    // Combine and shuffle choices
    const choices = [target, ...distractors].sort(() => Math.random() - 0.5);

    questions.push({
      id: `q_${index + 1}_${Date.now()}`,
      questionNumber: index + 1,
      targetNote: target,
      choices,
      timeLimitSec: 10,
    });
  });

  return questions;
}

/**
 * Calculate closeness score between two notes based on semitone difference.
 */
export function calculateClosenessScore(target: NoteInfo, chosen: NoteInfo): {
  semitoneDiff: number;
  score: number;
  label: string;
  badgeColor: string;
} {
  const semitoneDiff = Math.abs(target.midiNumber - chosen.midiNumber);

  if (semitoneDiff === 0) {
    return {
      semitoneDiff: 0,
      score: 1000,
      label: '完全一致 (ピタリ正解!)',
      badgeColor: 'bg-emerald-500 text-white',
    };
  } else if (semitoneDiff === 1) {
    return {
      semitoneDiff: 1,
      score: 700,
      label: 'ニアミス (1半音差)',
      badgeColor: 'bg-teal-600 text-white',
    };
  } else if (semitoneDiff === 2) {
    return {
      semitoneDiff: 2,
      score: 400,
      label: '惜しい! (2半音差)',
      badgeColor: 'bg-amber-500 text-white',
    };
  } else if (semitoneDiff === 3) {
    return {
      semitoneDiff: 3,
      score: 200,
      label: 'あと少し (3半音差)',
      badgeColor: 'bg-orange-500 text-white',
    };
  } else {
    return {
      semitoneDiff,
      score: 50,
      label: `離れています (${semitoneDiff}半音差)`,
      badgeColor: 'bg-slate-500 text-white',
    };
  }
}

/**
 * Speed bonus: 0-500 points depending on how fast the user answered within 10 seconds.
 */
export function calculateSpeedBonus(timeTakenSec: number, timeLimitSec: number = 10): number {
  if (timeTakenSec >= timeLimitSec) return 0;
  const ratio = Math.max(0, (timeLimitSec - timeTakenSec) / timeLimitSec);
  return Math.round(ratio * 500);
}

/**
 * Consecutive correct bonus (連続正解ボーナス).
 * streak: current consecutive correct count (after this answer).
 */
export function calculateStreakBonus(currentStreak: number): number {
  if (currentStreak <= 1) return 0;
  if (currentStreak === 2) return 200;
  if (currentStreak === 3) return 450;
  if (currentStreak === 4) return 800;
  if (currentStreak >= 5) return 1500; // Perfect 5-in-a-row combo!
  return 0;
}
