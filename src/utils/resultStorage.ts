import { AnswerResult, GameDifficulty } from '../types';
export interface SavedResult {
  id: string;
  date: string;
  difficulty: GameDifficulty;
  totalScore: number;
  questionCount: number;
  perfectCount: number;
  averageTimeSec: number;
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
    Number.isInteger(r.questionCount) && r.questionCount > 0 && Number.isInteger(r.perfectCount) && r.perfectCount <= r.questionCount
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
  };
  localStorage.setItem(KEY, JSON.stringify([...results, result]));
}
