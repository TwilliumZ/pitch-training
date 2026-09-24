import type { AnswerResult, LeaderboardCategory, LeaderboardEntry } from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'ランキングに接続できませんでした。もう一度お試しください。');
    return data as T;
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new Error(error instanceof Error && !['TypeError', 'TimeoutError'].includes(error.name)
      ? error.message : 'ランキングに接続できませんでした。通信を確認して再試行してください。');
  }
}

export function getLeaderboard(category: LeaderboardCategory, signal?: AbortSignal): Promise<LeaderboardEntry[]> {
  const query = new URLSearchParams(Object.entries(category).map(([key, value]) => [key, String(value)]));
  return request(`/api/leaderboard?${query}`, { signal });
}

export function saveLeaderboardEntry(id: string, name: string, category: LeaderboardCategory, history: AnswerResult[]): Promise<LeaderboardEntry> {
  const { questionCount, ...settings } = category;
  return request('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id, name, ...settings,
      answers: history.map((answer) => ({
        targetMidi: answer.targetNote.midiNumber,
        chosenMidi: answer.rawInputText === '時間切れ' ? null : answer.chosenNote.midiNumber,
        timeTakenSec: answer.timeTakenSec,
      })),
    }),
  });
}
