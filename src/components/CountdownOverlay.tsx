import React from 'react';

interface CountdownOverlayProps {
  questionNumber: number;
  totalQuestions: number;
  /** 残りカウント（0になるまで出題しない） */
  count: number;
}

/**
 * 出題直前のディレイ表示（機能1）。
 * 問題音を鳴らす前に数秒の間を置き、ユーザーが驚かないようにする。
 * 音声再生やタイマーには触らず、表示だけを担当する。
 */
export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  questionNumber,
  totalQuestions,
  count,
}) => {
  return (
    <div className="w-full bg-white rounded-3xl p-8 border border-moss-200 shadow-xl shadow-moss-100 text-center space-y-3 animate-in fade-in duration-200">
      <p className="text-xs font-bold text-moss-600 uppercase tracking-widest">
        第 {questionNumber} 問 / 全 {totalQuestions} 問
      </p>
      <div className="text-6xl font-black text-moss-600 tabular-nums" aria-live="polite">
        {count > 0 ? count : '♪'}
      </div>
      <p className="text-sm text-slate-500">まもなく出題します。音量を確認してください。</p>
    </div>
  );
};
