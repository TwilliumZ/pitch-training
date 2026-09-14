import React from 'react';
import { Trophy, HelpCircle, Volume2, VolumeX, Music2, Home } from 'lucide-react';

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
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-moss-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          {/* When（いつ？）
            ・今日の日付は？ → 2026-09-15
            例：2026-09-12
            ヒント：作業した日を書くだけでOK
            Where（どこ？）
            ・どのファイルを変更した？ → src/components/Navbar.tsx
            例：src/components/UserCard.jsx
            ヒント：フォルダ名＋ファイル名を書く
            Who（だれ？）
            ・誰が作業した？ →吉本＿
            例：k
            ヒント：自分の名前でOK
            What（なにをした？）
            ・どの部分を変更した？具体的に書く → ヘッダーのロゴアイコンを Sparkles から四分音符 (Music2) に変更した
            例：ユーザー名の表示ロジックを変更した
            ヒント：「〇〇を追加した」「△△を変更した」など行動レベルで書く
            Why（なぜ？）
            ・なぜその変更が必要だった？ → 音当てゲームなので音符の方が一目で分かるため
            例：APIの仕様変更で name が null の可能性が出たため
            ヒント：理由を一言で書く（エラー対策、見やすくするため、など）
            How（どうやって？）
            ・どんな手順で実現した？使った関数や処理の流れを書く → lucide-react の Sparkles を Music2 に置き換えただけ。大きさ (w-5 h-5) や緑の背景はそのままにした
            例：nullチェックを追加し、fallback文字列を返すようにした
            ヒント：「まず〜して、そのあと〜する」という順番で書く
          */}
          <div className="w-9 h-9 rounded-xl bg-moss-500 flex items-center justify-center text-white shadow-md shadow-moss-200">
            <Music2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className=" text-base font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
              音当てピッチマスター
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-moss-100 text-moss-700 border border-moss-200">
                基準音つき
              </span>
            </h1>
            <p className="text-xs text-slate-500">音を聞いて、4つの選択肢から当てよう！</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {showHome && (
    <button
      id="btn-go-home-header"
      type="button"
      onClick={onGoHome}
      className="px-3 py-1.5 rounded-lg bg-moss-50 text-moss-700 border border-moss-200 hover:bg-moss-100 font-medium text-xs flex items-center gap-1.5 transition-all"
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
                ? 'bg-moss-500 text-white border border-moss-500 hover:bg-moss-600'
                : 'bg-moss-50 text-slate-500 border border-moss-200 hover:bg-moss-100'
            }`}
            title={speechEnabled ? '音声読み上げON (クリックでOFF)' : '音声読み上げOFF (クリックでON)'}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{speechEnabled ? '読み上げON' : '読み上げOFF'}</span>
          </button>

<button type="button" onClick={onOpenHistory} className="px-3 py-2 rounded-lg bg-moss-100 text-moss-700 text-xs font-semibold">学習履歴</button>
          {/* Ranking Button */}
          <button
            id="btn-open-ranking-header"
            type="button"
            onClick={onOpenRanking}
            className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>ランキング</span>
          </button>

          {/* Rules / Help Button */}
          <button
            id="btn-open-rules"
            type="button"
            onClick={onOpenRules}
            className="p-2 rounded-lg bg-moss-50 text-slate-500 hover:bg-moss-100 border border-moss-200 transition-all text-xs"
            title="遊び方と配点ルール"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
