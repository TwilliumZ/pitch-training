import { analyzeNotes } from '../utils/noteAnalysis';
import type { SavedResult } from '../utils/resultStorage';

export function NoteWeaknessAnalysis({ results }: { results: SavedResult[] }) {
  const { analyzedGames, legacyGames, notes } = analyzeNotes(results);
  const weaknesses = notes.filter((n) => n.mistakes > 0).slice(0, 3);
  return (
    <section aria-labelledby="note-analysis-title" className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
      <h3 id="note-analysis-title" className="font-bold text-lg">間違えやすい音階</h3>
      {!analyzedGames ? <p className="mt-2 text-sm text-slate-300">音ごとの回答記録がまだありません。次のゲームを最後までプレイすると分析が表示されます。</p> : <>
        <p className="mt-2 text-sm text-slate-400">選択中の難易度の全 {analyzedGames} 回を分析。誤答率が高い順に表示しています。回答数が少ない音の傾向は目安です。時間切れは誤答率・混同の集計から除いています。</p>
        <p className="mt-3 text-sm text-indigo-200">
          {weaknesses.length ? `重点的に練習したい音：${weaknesses.map((s) => s.note.nameJa).join('、')}`
            : notes.some((s) => s.attempts > 0) ? '回答した音はすべて正解です。この調子で続けましょう！' : 'まだ分析できる回答がありません。次のゲームで回答してみましょう。'}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <caption className="sr-only">音ごとの誤答率と混同した音</caption>
            <thead className="text-slate-400"><tr>{['出題された音', '誤答 / 回答', '誤答率', '混同した音（回数順）', '時間切れ'].map((label) => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
            <tbody>{notes.map((s) => <tr key={s.note.id} className="border-t border-slate-700">
              <th scope="row" className="p-2">{s.note.nameJa} <span className="font-normal text-slate-400">{s.note.nameEn}</span></th>
              <td className="p-2">{s.mistakes} / {s.attempts}</td>
              <td className="p-2">{s.attempts ? `${Math.round(s.errorRate * 100)}%` : '—'}</td>
              <td className="p-2">{s.confusedNotes.map((c) => `${c.note.nameJa}（${c.count}回）`).join('、') || '—'}</td>
              <td className="p-2">{s.timeouts}回</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
      {legacyGames > 0 && <p className="mt-3 text-xs text-slate-400">過去の {legacyGames} 回は音ごとの記録がないため、分析対象外です。</p>}
    </section>
  );
}
