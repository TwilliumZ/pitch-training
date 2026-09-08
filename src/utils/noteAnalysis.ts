import { ALL_NOTES } from './notesData';
import type { SavedResult } from './resultStorage';

export function analyzeNotes(results: SavedResult[]) {
  const stats = ALL_NOTES.map((note) => ({
    note, attempts: 0, mistakes: 0, timeouts: 0,
    confusions: new Map<string, number>(),
  }));
  let analyzedGames = 0;
  for (const result of results) {
    if (!result.answers) continue;
    analyzedGames++;
    for (const answer of result.answers) {
      const stat = stats.find((s) => s.note.id === answer.targetNoteId)!;
      if (answer.chosenNoteId === null) {
        stat.timeouts++;
        continue;
      }
      stat.attempts++;
      if (answer.targetNoteId !== answer.chosenNoteId) {
        stat.mistakes++;
        stat.confusions.set(answer.chosenNoteId, (stat.confusions.get(answer.chosenNoteId) ?? 0) + 1);
      }
    }
  }
  const notes = stats.filter((s) => s.attempts > 0 || s.timeouts > 0).map((s) => ({
    ...s,
    errorRate: s.attempts ? s.mistakes / s.attempts : 0,
    confusedNotes: ALL_NOTES.filter((n) => s.confusions.has(n.id))
      .map((note) => ({ note, count: s.confusions.get(note.id)! }))
      .sort((a, b) => b.count - a.count),
  })).sort((a, b) => b.errorRate - a.errorRate || b.mistakes - a.mistakes || a.note.midiNumber - b.note.midiNumber);
  return { analyzedGames, legacyGames: results.length - analyzedGames, notes };
}
