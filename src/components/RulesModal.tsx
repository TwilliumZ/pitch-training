import React from 'react';
import { X, Target, Zap, Flame, Mic, Music, HelpCircle } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">遊び方 & スコアリング規則</h3>
              <p className="text-xs text-slate-400">1ゲーム5問・加点方式・音声解答対応</p>
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

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Rule 1: Reference tone & choice selection */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Music className="w-4 h-4 text-indigo-400" />
              <span>1. 基準音の確認と選択肢による解答</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              第1問の出題前に、基準となる音（基準のド・基準のラ）を聴いて音階の感覚をつかみます。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <strong className="text-slate-200">基準音の事前確認:</strong> ゲーム開始直後に基準音画面が表示され、耳を慣らしてから第1問に挑戦できます。
              </li>
              <li>
                <strong className="text-slate-200">4択選択肢からタップ解答:</strong> 出題された音を聴いて、画面の4つの選択肢（またはキーボード1〜4）を選んで解答します。各選択肢のスピーカーアイコンを押せば試し聴きも可能です。
              </li>
              <li>
                <strong className="text-slate-200">加点方式スコア:</strong> 1ゲーム全5問。正解からの近さ・解答の速さ・連続正解でドンドン加点されます。
              </li>
            </ul>
          </div>

          {/* Rule 2: Closeness scoring */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>2. 正解音との「近さ」スコアリング (加点)</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              正解の音からどのくらい音程が近いかで細かく加点されます！
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-emerald-500/30">
                <span className="font-bold text-emerald-400 block">完全一致 (0半音差)</span>
                <span className="font-mono text-white font-black">+1,000 pt</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-teal-500/30">
                <span className="font-bold text-teal-400 block">ニアミス (1半音差)</span>
                <span className="font-mono text-white font-black">+700 pt</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-amber-500/30">
                <span className="font-bold text-amber-400 block">惜しい! (2半音差)</span>
                <span className="font-mono text-white font-black">+400 pt</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-orange-500/30">
                <span className="font-bold text-orange-400 block">あと少し (3半音差)</span>
                <span className="font-mono text-white font-black">+200 pt</span>
              </div>
            </div>
          </div>

          {/* Rule 3: Speed bonus */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>3. 解答の速さによる加点ボーナス</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              制限時間は10秒。早く答えれば答えるほど最大<strong className="text-amber-400">+500 pt</strong>の追加速度ボーナスが加算されます！
            </p>
          </div>

          {/* Rule 4: Consecutive streak bonus */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>4. 連続正解ボーナス機能</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              連続で正解（完全一致またはニアミス）するごとにボーナスが跳ね上がります！
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-1 rounded bg-slate-900 text-[11px] text-slate-300 border border-slate-700">
                2連続: <strong>+200 pt</strong>
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 text-[11px] text-slate-300 border border-slate-700">
                3連続: <strong>+450 pt</strong>
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 text-[11px] text-slate-300 border border-slate-700">
                4連続: <strong>+800 pt</strong>
              </span>
              <span className="px-2 py-1 rounded bg-slate-900 text-[11px] text-amber-400 font-bold border border-amber-500/40">
                5連続パーフェクト: <strong>+1,500 pt</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all"
          >
            理解した！
          </button>
        </div>
      </div>
    </div>
  );
};
