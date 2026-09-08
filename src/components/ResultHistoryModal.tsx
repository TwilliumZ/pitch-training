import React, { useEffect, useRef, useState } from 'react';
import { getResults } from '../utils/resultStorage';
import { NoteWeaknessAnalysis } from './NoteWeaknessAnalysis';
const metrics = { totalScore: 'スコア (pt)', accuracy: '正答率 (%)', averageTimeSec: '平均回答時間 (秒)' };
type Metric = keyof typeof metrics;
export function ResultHistoryModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data] = useState(() => {
    try { return { results: getResults(), error: false }; }
    catch { return { results: [], error: true }; }
  });
  const [difficulty, setDifficulty] = useState('all');
  const [metric, setMetric] = useState<Metric>('totalScore');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const results = data.results.filter((r) => difficulty === 'all' || r.difficulty === difficulty);
  const recent = results.slice(-30);
  const value = (r: typeof recent[number]) => metric === 'accuracy' ? r.perfectCount / r.questionCount * 100 : r[metric];
  const max = metric === 'accuracy' ? 100 : Math.max(1, ...recent.map(value)) * 1.1;
  const points = recent.map((r, i) => ({ r, x: recent.length === 1 ? 320 : 65 + i * 535 / (recent.length - 1), y: 205 - value(r) / max * 175 }));
  const active = recent.find((r) => r.id === selected) ?? recent[recent.length - 1];
  return (
    <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="history-title" className="m-auto w-[calc(100%_-_2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-7 text-slate-100 backdrop:bg-slate-950/80">
      <div className="flex items-center justify-between gap-3">
        <h2 id="history-title" className="text-xl font-bold">学習履歴</h2>
        <button autoFocus onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-2">閉じる</button>
      </div>
      <p className="mt-3 text-sm text-slate-400">完了したゲームをこのブラウザに自動保存します。ブラウザのデータを削除すると履歴も消えます。</p>
      {data.error ? <p role="alert" className="mt-6 text-rose-300">履歴を読み込めませんでした。ブラウザの保存設定をご確認ください。</p> : <>
        <div className="my-5 flex flex-wrap gap-4 text-sm">
          <label>難易度 <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-lg bg-slate-800 p-2"><option value="all">すべて</option><option value="standard">標準</option><option value="advanced">上級</option></select></label>
          <label>表示 <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)} className="rounded-lg bg-slate-800 p-2">{Object.entries(metrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        {!results.length ? <p className="py-12 text-center text-slate-400">まだ記録がありません。ゲームを最後までプレイすると結果が保存されます。</p> : <>
          <p className="text-sm text-indigo-300">累計 {results.length} 回 · グラフは直近 {recent.length} 回（左から古い順）</p>
          <svg viewBox="0 0 640 245" className="mt-3 w-full" role="img" aria-label={`${metrics[metric]}の推移。詳細は下の履歴表で確認できます。`}>
            {[0, 0.5, 1].map((fraction) => <g key={fraction}><line x1="65" x2="600" y1={205 - fraction * 175} y2={205 - fraction * 175} stroke="#334155" /><text x="55" y={209 - fraction * 175} textAnchor="end" fill="#94a3b8" fontSize="12">{(max * fraction).toFixed(metric === 'averageTimeSec' ? 1 : 0)}</text></g>)}
            <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#818cf8" strokeWidth="3" />
            {points.map(({ r, x, y }, i) => <g key={r.id}><circle cx={x} cy={y} r="5" fill={r.id === active?.id ? '#fbbf24' : '#818cf8'} /><circle cx={x} cy={y} r="12" fill="transparent" onClick={() => setSelected(r.id)} className="cursor-pointer"><title>{new Date(r.date).toLocaleString('ja-JP')}: {value(r).toFixed(1)}</title></circle>{(i === 0 || i === points.length - 1) && <text x={x} y="232" textAnchor="middle" fill="#94a3b8" fontSize="12">{results.length - recent.length + i + 1}回目</text>}</g>)}
          </svg>
          {active && <p aria-live="polite" className="mb-4 text-sm text-indigo-200">{new Date(active.date).toLocaleString('ja-JP')} · {metrics[metric]}: {value(active).toFixed(metric === 'totalScore' ? 0 : 1)}</p>}
          <NoteWeaknessAnalysis results={results} />
          <div className="mt-6 overflow-x-auto max-h-72">
            <table className="w-full whitespace-nowrap text-left text-sm"><caption className="sr-only">保存された全ゲームの採点結果（新しい順）</caption><thead className="text-slate-400"><tr>{['日時', '難易度', 'スコア', '正解', '平均時間'].map((s) => <th key={s} scope="col" className="p-2">{s}</th>)}</tr></thead><tbody>{[...results].reverse().map((r) => <tr key={r.id} className="border-t border-slate-800"><td className="p-2">{new Date(r.date).toLocaleString('ja-JP')}</td><td className="p-2">{r.difficulty === 'standard' ? '標準' : '上級'}</td><td className="p-2">{r.totalScore.toLocaleString()} pt</td><td className="p-2">{r.perfectCount}/{r.questionCount}</td><td className="p-2">{r.averageTimeSec.toFixed(1)}秒</td></tr>)}</tbody></table>
          </div>
        </>}
      </>}
    </dialog>
  );
}
