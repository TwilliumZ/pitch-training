import React from 'react';
import { Zap, Clock } from 'lucide-react';
import { calculateSpeedBonus } from '../utils/notesData';

interface TimerSpeedBarProps {
  remainingTime: number;
  totalTime?: number;
}

export const TimerSpeedBar: React.FC<TimerSpeedBarProps> = ({
  remainingTime,
  totalTime = 10,
}) => {
  const percent = Math.max(0, Math.min(100, (remainingTime / totalTime) * 100));
  const currentPotentialBonus = calculateSpeedBonus(totalTime - remainingTime, totalTime);

  // Bar color based on urgency
  let barColor = 'bg-emerald-500';
  let badgeColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (percent < 30) {
    barColor = 'bg-rose-500';
    badgeColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  } else if (percent < 60) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  }

  return (
    <div className="w-full bg-slate-900/70 rounded-2xl p-3 border border-slate-800 shadow-sm space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>解答制限時間</span>
          <span className="font-mono text-sm font-black text-white ml-1">
            {remainingTime.toFixed(1)}s
          </span>
        </div>

        {/* Live Speed bonus preview */}
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold ${badgeColor}`}>
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>速度加点ボーナス: +{currentPotentialBonus} pt</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-100 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
