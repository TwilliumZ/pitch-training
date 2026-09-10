import React, { useEffect } from 'react';
import { AnswerResult } from '../types';
import { Volume2, ArrowRight, Flame, Zap, Target, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { playNoteSound } from '../utils/audioSynthesizer';

interface RoundResultBreakdownProps {
  result: AnswerResult;
  currentTotalScore: number;
  onNextQuestion: () => void;
  isLastQuestion: boolean;
}

export const RoundResultBreakdown: React.FC<RoundResultBreakdownProps> = ({
  result,
  currentTotalScore,
  onNextQuestion,
  isLastQuestion,
}) => {
  // Play target sound on click
  const playTarget = () => playNoteSound(result.targetNote.frequency, 1.2, 'piano');
  const playChosen = () => playNoteSound(result.chosenNote.frequency, 1.2, 'piano');

  useEffect(() => {
    // Keyboard shortcut Enter or Space to go next
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onNextQuestion]);

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-moss-200 shadow-xl shadow-moss-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner: Exact or Near */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black mb-1 shadow-sm">
          {result.rawInputText === '時間切れ' ? (
            <span className="flex items-center gap-1.5 text-amber-700 bg-amber-100 border border-amber-300 px-4 py-1 rounded-full">
              <AlertCircle className="w-4 h-4" />
              時間切れ（0pt）
            </span>
          ) : result.isExact ? (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-4 py-1 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              完全正解！ ピタリ一致 (+1,000pt)
            </span>
          ) : result.semitoneDiff === 1 ? (
            <span className="flex items-center gap-1.5 text-teal-300 bg-teal-500/20 border border-teal-500/40 px-4 py-1 rounded-full">
              <Sparkles className="w-4 h-4" />
              超ニアミス！ わずか1半音差 (+700pt)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-300 bg-amber-500/20 border border-amber-500/40 px-4 py-1 rounded-full">
              <AlertCircle className="w-4 h-4" />
              {result.semitoneDiff}半音差でした (+{result.closenessScore}pt)
            </span>
          )}
        </div>
        <h3 className="text-2xl font-black text-slate-800">第 {result.questionNumber} 問の採点結果</h3>
        <p className="text-xs text-slate-500">
          {result.rawInputText === '時間切れ'
            ? '制限時間内に回答できませんでした'
            : result.answeredVia === 'click'
            ? `🎯 選択肢から「${result.chosenNote.nameJa}」を選択して解答`
            : result.answeredVia === 'voice_speech'
            ? `🎙️ 音声「${result.rawInputText || ''}」で解答`
            : `🎵 歌声ピッチ検出で解答`}
        </p>
      </div>

      {/* Comparison Cards: Correct vs Chosen */}
      <div className="grid grid-cols-2 gap-4">
        {/* Correct Target Note */}
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center flex flex-col items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            正解の音
          </span>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-800">{result.targetNote.nameJa}</span>
            <span className="block text-xs font-semibold text-emerald-600">
              {result.targetNote.nameEn} ({result.targetNote.frequency.toFixed(1)}Hz)
            </span>
          </div>
          <button
            type="button"
            onClick={playTarget}
            className="px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>正解音を聴く</span>
          </button>
        </div>

        {/* User's Chosen Note */}
        <div
          className={`rounded-2xl p-4 text-center flex flex-col items-center justify-between border ${
            result.isExact
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          {result.rawInputText === '時間切れ' ? (
            <div className="my-auto text-sm font-bold text-amber-700">未回答</div>
          ) : (
            <>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                あなたの解答
              </span>
              <div className="my-2">
                <span className="text-3xl font-black text-slate-800">{result.chosenNote.nameJa}</span>
                <span className="block text-xs font-semibold text-slate-500">
                  {result.chosenNote.nameEn} ({result.chosenNote.frequency.toFixed(1)}Hz)
                </span>
              </div>
              <button
                type="button"
                onClick={playChosen}
                className="px-3 py-1 rounded-lg bg-white hover:bg-moss-50 text-moss-700 border border-moss-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>解答音を聴く</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Additive Scoring Breakdown List */}
      <div className="bg-moss-50/60 rounded-2xl p-4 border border-moss-100 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          加点の内訳 (スコアリング)
        </h4>

        <div className="space-y-2 text-sm">
          {/* 1. Closeness Score */}
          <div className="flex items-center justify-between py-1 border-b border-moss-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-moss-100 text-moss-600">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-700">正解との近さスコア</span>
                <span className="text-xs text-slate-500 ml-2">
                  ({result.semitoneDiff === 0 ? '完全一致 0半音差' : `${result.semitoneDiff}半音のズレ`})
                </span>
              </div>
            </div>
            <span className="font-mono font-black text-moss-600 text-base">
              +{result.closenessScore.toLocaleString()} pt
            </span>
          </div>

          {/* 2. Speed Bonus */}
          <div className="flex items-center justify-between py-1 border-b border-moss-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-700">解答速度ボーナス</span>
                <span className="text-xs text-slate-500 ml-2">
                  ({result.timeTakenSec.toFixed(1)}秒で即答)
                </span>
              </div>
            </div>
            <span className="font-mono font-black text-amber-600 text-base">
              +{result.speedBonus.toLocaleString()} pt
            </span>
          </div>

          {/* 3. Consecutive Streak Bonus */}
          <div className="flex items-center justify-between py-1 border-b border-moss-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100 text-orange-500">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-700">連続正解ボーナス</span>
                <span className="text-xs text-slate-500 ml-2">
                  {result.streakCountAfter > 1
                    ? `(${result.streakCountAfter}問連続正解中!)`
                    : result.streakBonus > 0
                    ? `(ボーナス適用)`
                    : '(連続正解なし)'}
                </span>
              </div>
            </div>
            <span className="font-mono font-black text-orange-500 text-base">
              +{result.streakBonus.toLocaleString()} pt
            </span>
          </div>

          {/* Total Gained for this round */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-black text-slate-800 text-base">今回獲得ポイント合計</span>
            <span className="font-mono font-black text-2xl text-emerald-600">
              +{result.totalRoundScore.toLocaleString()} pt
            </span>
          </div>
        </div>
      </div>

      {/* Next Question / Finish Button */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-xs text-slate-500 block">現在の累計得点</span>
          <span className="text-xl font-black text-amber-600">
            {currentTotalScore.toLocaleString()} pt
          </span>
        </div>

        <button
          id="btn-next-question"
          type="button"
          onClick={onNextQuestion}
          className="px-6 py-3 rounded-2xl bg-moss-500 hover:bg-moss-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-moss-200 transition-all transform active:scale-95"
        >
          <span>{isLastQuestion ? '最終結果を見る' : '次の問題へ'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
