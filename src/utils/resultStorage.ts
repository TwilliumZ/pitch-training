import { AnswerResult, GameDifficulty } from '../types';
import { ALL_NOTES } from './notesData';

export interface SavedAnswer {
  targetNoteId: string;
  chosenNoteId: string | null;
}

function isSavedAnswer(value: unknown): value is SavedAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as SavedAnswer;
  return ALL_NOTES.some((n) => n.id === answer.targetNoteId) &&
    (answer.chosenNoteId === null || ALL_NOTES.some((n) => n.id === answer.chosenNoteId));
}
export interface SavedResult {
  id: string;
  date: string;
  difficulty: GameDifficulty;
  totalScore: number;
  questionCount: number;
  perfectCount: number;
  averageTimeSec: number;
  answers?: SavedAnswer[];
}
const KEY = 'pitch_master_results_v1';
export function getResults(): SavedResult[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every((r) =>
    r && typeof r.id === 'string' && typeof r.date === 'string' && Number.isFinite(Date.parse(r.date)) &&
    ['standard', 'advanced'].includes(r.difficulty) &&
    [r.totalScore, r.questionCount, r.perfectCount, r.averageTimeSec].every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0) &&
    Number.isInteger(r.questionCount) && r.questionCount > 0 && Number.isInteger(r.perfectCount) && r.perfectCount <= r.questionCount &&
    (r.answers === undefined || (Array.isArray(r.answers) && r.answers.length === r.questionCount && r.answers.every(isSavedAnswer)))
  )) throw new Error('履歴を読み込めませんでした。');
  return data as SavedResult[];
}
export function saveResult(id: string, difficulty: GameDifficulty, totalScore: number, answers: AnswerResult[]): void {
  if (!answers.length) throw new Error('採点結果がありません。');
  const results = getResults();
  if (results.some((r) => r.id === id)) return;
  const result: SavedResult = {
    id, date: new Date().toISOString(), difficulty, totalScore,
    questionCount: answers.length,
    perfectCount: answers.filter((r) => r.isExact).length,
    averageTimeSec: answers.reduce((sum, r) => sum + r.timeTakenSec, 0) / answers.length,
    answers: answers.map((r) => ({
      targetNoteId: r.targetNote.id,
      chosenNoteId: r.rawInputText === '時間切れ' ? null : r.chosenNote.id,
    })),
  };
  localStorage.setItem(KEY, JSON.stringify([...results, result]));
}
