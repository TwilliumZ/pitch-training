import { LeaderboardEntry } from '../types';

const LEADERBOARD_KEY = 'pitch_master_leaderboard_v1';

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'seed-1',
    name: '絶対音感の達人',
    totalScore: 8450,
    perfectCount: 5,
    maxStreak: 5,
    averageTimeSec: 1.4,
    difficulty: 'standard',
    date: '2026-09-01',
  },
  {
    id: 'seed-2',
    name: 'マエストロ山田',
    totalScore: 7820,
    perfectCount: 4,
    maxStreak: 4,
    averageTimeSec: 2.1,
    difficulty: 'standard',
    date: '2026-09-02',
  },
  {
    id: 'seed-3',
    name: 'ソプラノ姫',
    totalScore: 6950,
    perfectCount: 4,
    maxStreak: 3,
    averageTimeSec: 2.8,
    difficulty: 'standard',
    date: '2026-09-03',
  },
  {
    id: 'seed-4',
    name: '音大生タカシ',
    totalScore: 5800,
    perfectCount: 3,
    maxStreak: 2,
    averageTimeSec: 3.5,
    difficulty: 'standard',
    date: '2026-09-04',
  },
  {
    id: 'seed-5',
    name: 'ピアノ初心者',
    totalScore: 4200,
    perfectCount: 2,
    maxStreak: 2,
    averageTimeSec: 4.8,
    difficulty: 'standard',
    date: '2026-09-04',
  },
];

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(DEFAULT_LEADERBOARD));
      return DEFAULT_LEADERBOARD;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a, b) => b.totalScore - a.totalScore);
    }
    return DEFAULT_LEADERBOARD;
  } catch (err) {
    console.warn('Error reading leaderboard:', err);
    return DEFAULT_LEADERBOARD;
  }
}

export function saveLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'date'>): LeaderboardEntry[] {
  const current = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `rank_${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
  };

  const updated = [...current, newEntry].sort((a, b) => b.totalScore - a.totalScore).slice(0, 15);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving leaderboard:', err);
  }
  return updated;
}

export function clearLeaderboard(): LeaderboardEntry[] {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_LEADERBOARD;
}
