import React from 'react';
import { Flame, Star, Award } from 'lucide-react';
import { calculateStreakBonus } from '../utils/notesData';

interface ScoreHeaderProps {
  questionNumber: number;
  totalQuestions?: number;
  currentScore: number;
  streakCount: number;
}

export const ScoreHeader: React.FC<ScoreHeaderProps> = ({
  questionNumber,
  totalQuestions = 5,
  currentScore,
  streakCount,
}) => {
  const nextStreakBonus = calculateStreakBonus(streakCount + 1);

  return (
    <div className="w-full bg-white rounded-2xl p-4 border border-moss-200 shadow-sm shadow-moss-100 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Question Counter & Stepper */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-moss-600">問題進行度</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800">{questionNumber}</span>
            <span className="text-sm font-medium text-slate-500">/ {totalQuestions} 問</span>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 ml-2">
          {Array.from({ length: totalQuestions }).map((_, idx) => {
            const isCompleted = idx + 1 < questionNumber;
            const isCurrent = idx + 1 === questionNumber;
            return (
              <div
                key={idx}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'w-4 bg-emerald-500'
                    : isCurrent
                    ? 'w-7 bg-moss-500 shadow-sm shadow-moss-200'
                    : 'w-2.5 bg-moss-100'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Streak Combo Badge */}
      <div className="flex items-center gap-2">
        {streakCount > 1 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
            <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
            <span className="text-xs font-black tracking-wide">
              {streakCount}連続正解コンボ!
            </span>
            <span className="text-[11px] font-semibold text-amber-200/90 ml-1">
              (次回 +{nextStreakBonus}pt)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-moss-50 text-slate-500 text-xs border border-moss-100">
            <Award className="w-3.5 h-3.5 text-moss-500" />
            <span>連続正解ボーナス準備中</span>
          </div>
        )}
      </div>

      {/* Cumulative Score */}
      <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-moss-100 pt-2 sm:pt-0">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          現在の合計スコア (加点方式)
        </span>
        <div className="text-2xl font-black text-amber-400 tracking-tight flex items-baseline gap-1">
          <span>{currentScore.toLocaleString()}</span>
          <span className="text-xs font-bold text-amber-400/70">pt</span>
        </div>
      </div>
    </div>
  );
};
