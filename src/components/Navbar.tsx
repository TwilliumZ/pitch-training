import React from 'react';
import { Trophy, HelpCircle, Volume2, VolumeX, Sparkles, Home } from 'lucide-react';

interface NavbarProps {
  onOpenHistory: () => void;
  onOpenRanking: () => void;
  onOpenRules: () => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  onGoHome: () => void;  // ← 追加: ホームに戻る関数
  showHome: boolean;     // ← 追加: start画面では隠すための旗
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  onOpenRanking,
  onOpenRules,
  speechEnabled,
  onToggleSpeech,
  onGoHome,
  showHome, 
}) => {
  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
              音当てピッチマスター
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                基準音つき
              </span>
            </h1>
            <p className="text-xs text-slate-400">音を聞いて、4つの選択肢から当てよう！</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {showHome && (
    <button
      id="btn-go-home-header"
      type="button"
      onClick={onGoHome}
      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 font-medium text-xs flex items-center gap-1.5 transition-all"
      title="ホームに戻る">
      <Home className="w-4 h-4" />
      <span>ホーム</span>
    </button>)}
          {/* Narrator Voice Toggle */}
          <button
            id="btn-toggle-speech-narration"
            type="button"
            onClick={onToggleSpeech}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              speechEnabled
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
            title={speechEnabled ? '音声読み上げON (クリックでOFF)' : '音声読み上げOFF (クリックでON)'}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{speechEnabled ? '読み上げON' : '読み上げOFF'}</span>
          </button>

<button type="button" onClick={onOpenHistory} className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-200 text-xs font-semibold">学習履歴</button>
          {/* Ranking Button */}
          <button
            id="btn-open-ranking-header"
            type="button"
            onClick={onOpenRanking}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>ランキング</span>
          </button>

          {/* Rules / Help Button */}
          <button
            id="btn-open-rules"
            type="button"
            onClick={onOpenRules}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all text-xs"
            title="遊び方と配点ルール"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
