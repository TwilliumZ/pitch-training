import React, { useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, X, Medal, Flame, Zap, Target, Trash2 } from 'lucide-react';
import { clearLeaderboard, getLeaderboard } from '../utils/leaderboardStorage';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => getLeaderboard());

  const handleClear = () => {
    if (window.confirm('ランキング記録を初期化してもよろしいですか？')) {
      const reset = clearLeaderboard();
      setEntries(reset);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">殿堂入りランキング</h3>
              <p className="text-xs text-slate-400">上位ハイスコア記録 (1ゲーム5問)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-800/60">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              記録はまだありません。ゲームをプレイして登録しましょう！
            </div>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              let rankIcon = (
                <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center">
                  {rank}
                </span>
              );

              if (rank === 1) {
                rankIcon = (
                  <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black flex items-center justify-center">
                    🥇
                  </span>
                );
              } else if (rank === 2) {
                rankIcon = (
                  <span className="w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 border border-slate-400/40 text-xs font-black flex items-center justify-center">
                    🥈
                  </span>
                );
              } else if (rank === 3) {
                rankIcon = (
                  <span className="w-7 h-7 rounded-full bg-amber-700/20 text-amber-400 border border-amber-600/40 text-xs font-black flex items-center justify-center">
                    🥉
                  </span>
                );
              }

              return (
                <div
                  key={entry.id}
                  className={`pt-2.5 pb-2.5 flex items-center justify-between gap-3 px-2 rounded-xl transition-colors ${
                    rank <= 3 ? 'bg-slate-800/40' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {rankIcon}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                        {entry.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <Target className="w-3 h-3 text-emerald-400" />
                          正解 {entry.perfectCount}/5
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-orange-400" />
                          {entry.maxStreak}連鎖
                        </span>
                        <span className="flex items-center gap-0.5 hidden sm:flex">
                          <Zap className="w-3 h-3 text-amber-400" />
                          平均 {entry.averageTimeSec}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-amber-400 text-base sm:text-lg">
                      {entry.totalScore.toLocaleString()}
                      <span className="text-xs font-bold text-amber-400/70 ml-1">pt</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{entry.date}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ランキングをリセット</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
