import React, { useState, useEffect } from 'react';
import { AnswerResult } from '../types';
import { Trophy, Award, Flame, Zap, RotateCcw, Check, Sparkles, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveLeaderboardEntry } from '../utils/leaderboardStorage';

interface GameOverModalProps {
  totalScore: number;
  history: AnswerResult[];
  onRestart: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  totalScore,
  history,
  onRestart,
  onOpenLeaderboard,
}) => {
  const [playerName, setPlayerName] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Trigger celebration confetti
  useEffect(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }, []);

  // Stats
  const totalQuestions = history.length || 5;
  const perfectCount = history.filter((h) => h.isExact).length;
  const maxStreak = Math.max(0, ...history.map((h) => h.streakCountAfter));
  const avgTime =
    history.length > 0
      ? history.reduce((acc, h) => acc + h.timeTakenSec, 0) / history.length
      : 0;

  // Rank evaluation (問題数でスケール)
  const scale = totalQuestions / 5;
  let rankBadge = {
    title: 'Cランク: 音当てチャレンジャー',
    color: 'from-slate-500 to-slate-700',
    border: 'border-slate-500',
    desc: '音の高さの違いを聞き分ける基礎が身についています！練習してさらにスコアを伸ばそう！',
  };
  if (totalScore >= 7500 * scale) {
    rankBadge = {
      title: '👑 SSSランク: 絶対音感マスター',
      color: 'from-amber-400 via-orange-500 to-yellow-500',
      border: 'border-amber-400',
      desc: '驚異的な絶対音感の持ち主！わずかな半音の差も完璧に聞き分け、音速で即答しました！',
    };
  } else if (totalScore >= 6000 * scale) {
    rankBadge = {
      title: '🥇 Sランク: マエストロ音感',
      color: 'from-emerald-400 to-teal-600',
      border: 'border-emerald-400',
      desc: '素晴らしい音感と瞬発力！トップクラスの耳を持っています！',
    };
  } else if (totalScore >= 4500 * scale) {
    rankBadge = {
      title: '🥈 Aランク: プロフェッショナル音感',
      color: 'from-blue-400 to-indigo-600',
      border: 'border-blue-400',
      desc: '高い精度で音を聞き取れています！スピードボーナスを意識すればさらに上位へ！',
    };
  } else if (totalScore >= 3000 * scale) {
    rankBadge = {
      title: '🥉 Bランク: グッドリスナー',
      color: 'from-purple-400 to-pink-600',
      border: 'border-purple-400',
      desc: '多くの音を正確に捉えています！連続正解ボーナスを狙ってみよう！',
    };
  }

  const handleSaveToRanking = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = playerName.trim() || '名無しリスナー';
    saveLeaderboardEntry({
      name: finalName,
      totalScore,
      perfectCount,
      maxStreak,
      averageTimeSec: Number(avgTime.toFixed(1)),
      difficulty: 'standard',
    });
    setIsSaved(true);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/95 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Trophy and Rank Badge */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/30 mb-3">
          <Trophy className="w-8 h-8 fill-slate-900" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
          全{totalQuestions}問 終了！ お疲れ様でした！
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
          ゲーム結果発表
        </h2>
      </div>

      {/* Main Score Box */}
      <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 rounded-3xl p-6 border border-slate-700/80 shadow-inner space-y-3">
        <span className="text-xs font-bold text-slate-400">最終獲得スコア (加点総合計)</span>
        <div className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
          {totalScore.toLocaleString()} <span className="text-xl font-bold text-amber-300/70">pt</span>
        </div>

        {/* Rank Title Pill */}
        <div className="inline-block mt-2">
          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-400/40 text-sm sm:text-base font-black text-amber-300">
            {rankBadge.title}
          </div>
        </div>
        <p className="text-xs text-slate-300 max-w-md mx-auto">{rankBadge.desc}</p>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3">
          <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-400 mb-1">
              <Target className="w-3.5 h-3.5" />
              <span>完全正解</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {perfectCount} <span className="text-xs text-slate-400 font-medium">/ {totalQuestions}問</span>
            </div>
          </div>

          <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-orange-400 mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>最大コンボ</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {maxStreak} <span className="text-xs text-slate-400 font-medium">連鎖</span>
            </div>
          </div>

          <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-400 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>平均速度</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {avgTime.toFixed(1)} <span className="text-xs text-slate-400 font-medium">秒</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Questions History Table */}
      <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-left space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          出題履歴と配点内訳
        </h4>
        <div className="divide-y divide-slate-800 text-xs">
          {history.map((item, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 font-bold text-slate-400">Q{item.questionNumber}</span>
                <span className="font-bold text-white">
                  正解: {item.targetNote.nameJa} ↔ 解答: {item.chosenNote.nameJa}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    item.isExact
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {item.semitoneDiff === 0 ? '完全一致' : `${item.semitoneDiff}半音差`}
                </span>
              </div>
              <div className="text-right font-mono font-bold text-slate-200">
                +{item.totalRoundScore.toLocaleString()} pt
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save to Ranking Form */}
      <div className="bg-slate-850 rounded-2xl p-4 border border-indigo-500/30 text-left space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">ランキングにスコアを登録</span>
        </div>

        {!isSaved ? (
          <form onSubmit={handleSaveToRanking} className="flex flex-col sm:flex-row gap-2">
            <input
              id="player-name-input"
              type="text"
              maxLength={12}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="プレイヤー名を入力 (例: 音感マスター)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              id="btn-save-ranking"
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>ランキングに登録</span>
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>ランキングにスコアを登録しました！</span>
            </div>
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="underline text-emerald-200 hover:text-white"
            >
              ランキングを見る →
            </button>
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          id="btn-restart-game"
          type="button"
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>もう一度遊ぶ (次の{totalQuestions}問)</span>
        </button>

        <button
          id="btn-view-leaderboard"
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>ランキング一覧を見る</span>
        </button>
      </div>
    </div>
  );
};
