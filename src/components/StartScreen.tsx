import React from 'react';
import { Play, Trophy, Sparkles, Volume2, Target, Flame, Zap, Settings2 } from 'lucide-react';
import { GameDifficulty } from '../types';
import { getMaxQuestionsNoDup } from '../utils/notesData';

interface StartScreenProps {
  difficulty: GameDifficulty;
  onSelectDifficulty: (diff: GameDifficulty) => void;
  onStartGame: () => void;
  onOpenLeaderboard: () => void;
  onOpenRules: () => void;
  numQuestions: number;
  onSelectNumQuestions: (n: number) => void;
  allowDuplicates: boolean;
  onToggleDuplicates: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  difficulty,
  onSelectDifficulty,
  onStartGame,
  onOpenLeaderboard,
  onOpenRules,
  numQuestions,
  onSelectNumQuestions,
  allowDuplicates,
  onToggleDuplicates,
}) => {
  const maxNoDup = getMaxQuestionsNoDup(difficulty);
  const maxCount = allowDuplicates ? 20 : maxNoDup;
  const clampedCount = Math.max(1, Math.min(maxCount, numQuestions));
  const presetCounts = [3, 5, 8].filter((n) => n <= maxCount);
  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6 text-center animate-in fade-in duration-300">
      {/* Icon badge */}
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-4 animate-bounce">
          <Sparkles className="w-10 h-10" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold mb-2">
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>出題前に基準音を確認・選択肢タップで解答</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          音当てピッチマスター
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-2 leading-relaxed">
          第1問の前に基準音を聴いて音感をセット！出題される音を聞いて4つの選択肢から当てよう。
          正解の音からどのくらい近いか・解答の速さ・連続正解でドンドン加点！
        </p>
      </div>

      {/* 3 Core Rules Highlights */}
      <div className="grid grid-cols-3 gap-2.5 text-left">
        <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
            <Target className="w-4 h-4 shrink-0" />
            <span>近さ加点</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            完全一致で最大1,000pt！半音差でもニアミス加点！
          </p>
        </div>

        <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
            <Zap className="w-4 h-4 shrink-0" />
            <span>速度加点</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            10秒制限！すばやい即答で最大+500pt加点！
          </p>
        </div>

        <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 mb-1">
            <Flame className="w-4 h-4 shrink-0" />
            <span>連鎖ボーナス</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            連続正解でボーナスが跳ね上がるフィーバー機能！
          </p>
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800 text-left space-y-2">
        <span className="text-xs font-bold text-slate-400 block">出題モードの選択</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectDifficulty('standard')}
            className={`p-3 rounded-xl border text-left transition-all ${
              difficulty === 'standard'
                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold">スタンダード</div>
            <div className="text-[11px] text-slate-400 mt-0.5">白鍵のみ (ド・レ・ミ・ファ・ソ・ラ・シ)</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectDifficulty('advanced')}
            className={`p-3 rounded-xl border text-left transition-all ${
              difficulty === 'advanced'
                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold">アドバンス</div>
            <div className="text-[11px] text-slate-400 mt-0.5">黒鍵含む (12半音フルスケール)</div>
          </button>
        </div>
      </div>

      {/* 出題設定: 折りたたみで表紙をスッキリ保つ */}
      <details className="bg-slate-950/60 rounded-2xl border border-slate-800 text-left group">
        <summary className="p-3.5 cursor-pointer list-none flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white">
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-slate-400" />
            出題設定: 全{clampedCount}問・重複{allowDuplicates ? 'あり' : 'なし'}
          </span>
          <span className="text-slate-500 group-open:rotate-90 transition-transform">▶</span>
        </summary>
        <div className="px-3.5 pb-3.5 space-y-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5">問題数 (1〜{maxCount}問)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectNumQuestions(Math.max(1, clampedCount - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700"
              >
                −
              </button>
              <span className="flex-1 text-center text-lg font-black text-white">{clampedCount}問</span>
              <button
                type="button"
                onClick={() => onSelectNumQuestions(Math.min(maxCount, clampedCount + 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700"
              >
                ＋
              </button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {presetCounts.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSelectNumQuestions(n)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    clampedCount === n
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {n}問
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-2 bg-slate-900 rounded-xl p-2.5 border border-slate-800 cursor-pointer">
            <span className="text-xs text-slate-300">
              <span className="font-bold block">音の重複あり</span>
              <span className="text-[11px] text-slate-500">OFFなら最大{maxNoDup}問まで・ONなら最大20問</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={allowDuplicates}
              onClick={onToggleDuplicates}
              className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${
                allowDuplicates ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  allowDuplicates ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>
      </details>

      {/* Start Button */}
      <div className="space-y-3 pt-1">
        <button
          id="btn-start-game-main"
          type="button"
          onClick={onStartGame}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-700 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 transition-all transform active:scale-98"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>ゲームスタート (全{clampedCount}問)</span>
        </button>

        <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="hover:text-amber-400 flex items-center gap-1.5 transition-colors"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>ランキングを見る</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={onOpenRules}
            className="hover:text-slate-200 transition-colors"
          >
            遊び方・配点詳細
          </button>
        </div>
      </div>
    </div>
  );
};
