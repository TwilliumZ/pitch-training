import React from 'react';
import { ArrowLeft, Trophy, HelpCircle, Volume2, VolumeX } from 'lucide-react';
import { GameDifficulty } from '../types';

interface SettingsScreenProps {
  difficulty: GameDifficulty;
  onSelectDifficulty: (diff: GameDifficulty) => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  onOpenLeaderboard: () => void;
  onOpenRules: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  difficulty,
  onSelectDifficulty,
  speechEnabled,
  onToggleSpeech,
  onOpenLeaderboard,
  onOpenRules,
  onBack,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-moss-200 shadow-xl shadow-moss-100 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-moss-50 text-moss-700 hover:bg-moss-100 border border-moss-200 transition-colors"
          title="スタートに戻る"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-left">
          <h2 className="text-xl font-black text-slate-800">設定</h2>
          <p className="text-xs text-slate-500">出題モード・読み上げ・その他</p>
        </div>
      </div>

      {/* Difficulty selector (moved from StartScreen) */}
      <div className="bg-moss-50/60 rounded-2xl p-3.5 border border-moss-100 text-left space-y-2">
        <span className="text-xs font-bold text-slate-500 block">出題モードの選択</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectDifficulty('standard')}
            className={`p-3 rounded-xl border text-left transition-all ${
              difficulty === 'standard'
                ? 'bg-moss-500 border-moss-500 text-white shadow-sm'
                : 'bg-white border-moss-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="text-xs font-bold">スタンダード</div>
            <div className={`text-[11px] mt-0.5 ${difficulty === 'standard' ? 'text-moss-50' : 'text-slate-400'}`}>
              白鍵のみ (ド・レ・ミ・ファ・ソ・ラ・シ)
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectDifficulty('advanced')}
            className={`p-3 rounded-xl border text-left transition-all ${
              difficulty === 'advanced'
                ? 'bg-moss-500 border-moss-500 text-white shadow-sm'
                : 'bg-white border-moss-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="text-xs font-bold">アドバンス</div>
            <div className={`text-[11px] mt-0.5 ${difficulty === 'advanced' ? 'text-moss-50' : 'text-slate-400'}`}>
              黒鍵含む (12半音フルスケール)
            </div>
          </button>
        </div>
      </div>

      {/* Speech toggle (moved from Navbar) */}
      <div className="bg-moss-50/60 rounded-2xl p-3.5 border border-moss-100 text-left">
        <span className="text-xs font-bold text-slate-500 block mb-2">読み上げ</span>
        <button
          type="button"
          onClick={onToggleSpeech}
          className={`w-full p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
            speechEnabled
              ? 'bg-moss-500 border-moss-500 text-white'
              : 'bg-white border-moss-200 text-slate-500'
          }`}
        >
          {speechEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          <span className="text-sm font-bold">{speechEnabled ? '読み上げON' : '読み上げOFF'}</span>
        </button>
      </div>

      {/* Others (moved from StartScreen) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full p-3 rounded-xl bg-white border border-moss-200 text-slate-700 hover:bg-moss-50 flex items-center gap-2.5 transition-colors text-sm font-bold"
        >
          <Trophy className="w-5 h-5 text-moss-600" />
          <span>ランキングを見る</span>
        </button>
        <button
          type="button"
          onClick={onOpenRules}
          className="w-full p-3 rounded-xl bg-white border border-moss-200 text-slate-700 hover:bg-moss-50 flex items-center gap-2.5 transition-colors text-sm font-bold"
        >
          <HelpCircle className="w-5 h-5 text-moss-600" />
          <span>遊び方・配点詳細</span>
        </button>
      </div>
    </div>
  );
};
