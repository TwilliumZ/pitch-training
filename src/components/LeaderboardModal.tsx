import React, { useEffect, useState } from 'react';
import type { LeaderboardCategory, LeaderboardEntry } from '../types';
import { Trophy, X, RefreshCw } from 'lucide-react';
import { getLeaderboard } from '../utils/leaderboardStorage';

interface LeaderboardModalProps {
  onClose: () => void;
  initialCategory: LeaderboardCategory;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, initialCategory }) => {
  const [category, setCategory] = useState(initialCategory);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setEntries([]);
    getLeaderboard(category, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setEntries(data); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'ランキングを読み込めませんでした。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, refresh]);

  const selectClass = 'mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-2 text-white';
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="ranking-title" className="w-full max-w-xl bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-200">
        <header className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div><h2 id="ranking-title" className="font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400" />みんなのランキング</h2>
            <p className="mt-1 text-xs text-slate-400">同じ条件で遊んだ仲間の上位50記録</p></div>
          <button type="button" aria-label="ランキングを閉じる" onClick={onClose} className="p-2"><X /></button>
        </header>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-b border-slate-700">
          <label>難易度<select className={selectClass} value={category.difficulty} onChange={(e) => setCategory({ ...category, difficulty: e.target.value as LeaderboardCategory['difficulty'] })}><option value="standard">標準</option><option value="advanced">上級</option></select></label>
          <label>回答方法<select className={selectClass} value={category.answerMode} onChange={(e) => setCategory({ ...category, answerMode: e.target.value as LeaderboardCategory['answerMode'] })}><option value="choice">選択式</option><option value="voice">音声回答</option></select></label>
          <label>問題数<select className={selectClass} value={category.questionCount} onChange={(e) => setCategory({ ...category, questionCount: Number(e.target.value) })}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}問</option>)}</select></label>
          <label>同じ音の出題<select className={selectClass} value={String(category.allowDuplicates)} onChange={(e) => setCategory({ ...category, allowDuplicates: e.target.value === 'true' })}><option value="false">重複なし</option><option value="true">重複あり</option></select></label>
          <label>練習の種類<select className={selectClass} value={String(category.practice)} onChange={(e) => setCategory({ ...category, practice: e.target.value === 'true' })}><option value="false">通常ゲーム</option><option value="true">間違えた問題の再練習</option></select></label>
        </div>
        <div className="p-4 overflow-y-auto flex-1" aria-live="polite" aria-busy={loading}>
          {loading ? <p className="py-8 text-center">読み込み中…</p> : error ? <p role="alert" className="py-6 text-rose-300">{error}</p> : entries.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">この条件の記録はまだありません。ゲーム終了後に登録しましょう！</p> : <ol className="space-y-2">{entries.map((entry, index) => (
            <li key={entry.id} className="flex justify-between gap-3 rounded-xl bg-slate-800 p-3">
              <div className="min-w-0"><div className="font-bold truncate"><span className="mr-2 text-amber-400">{index + 1}位</span>{entry.name}</div>
                <div className="mt-1 text-xs text-slate-400">正解 {entry.perfectCount}/{entry.questionCount}問 ・ {entry.maxStreak}連鎖 ・ 平均 {entry.averageTimeSec.toFixed(1)}秒</div></div>
              <div className="text-right shrink-0"><p className="font-bold text-amber-400">{entry.totalScore.toLocaleString()} pt</p><time className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString('ja-JP')}</time></div>
            </li>
          ))}</ol>}
        </div>
        <footer className="p-4 border-t border-slate-700 flex justify-between items-center text-xs">
          <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} className="flex gap-2 items-center rounded-lg bg-slate-800 px-3 py-2 disabled:opacity-50"><RefreshCw className="w-4 h-4" />{error ? '再試行' : '最新の記録に更新'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800">閉じる</button>
        </footer>
      </section>
    </div>
  );
};
