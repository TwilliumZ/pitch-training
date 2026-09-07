import React from 'react';
import { Play, Settings , Sparkles ,Volume2} from 'lucide-react';

interface StartScreenProps {
     onStartGame: () => void;
      onOpenSettings : () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  
  onStartGame,
  onOpenSettings, 
  
}) => {
  return (
    <div className="w-full max-w-xl mx-auto bg-white backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-moss-200 shadow-xl shadow-moss-100 space-y-6 text-center animate-in fade-in duration-300">
      {/* Icon badge */}
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-moss-500 flex items-center justify-center text-white shadow-xl shadow-moss-200 mb-4">
          <Sparkles className="w-10 h-10" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-moss-100 text-moss-700 border border-moss-200 text-xs font-bold mb-2 ">
          <Volume2 className="w-3.5 h-3.5 text-moss-600" />
          <span>出題前に基準音を確認・選択肢タップで解答</span>
        </div>
        <h1 className=" text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
          音当てピッチマスター
        </h1>
        <p className=" text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed ">
          第1問の前に基準音を聴いて音感をセット！出題される音を聞いて4つの選択肢から当てよう。
          正解の音からどのくらい近いか・解答の速さ・連続正解でドンドン加点！
        </p>
      </div>

      {/* Start Button */}
      <div className="space-y-3 pt-1">
        <button
          id="btn-start-game-main"
          type="button"
          onClick={onStartGame}
          className="w-full py-4 rounded-2xl bg-moss-500 hover:bg-moss-600 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-moss-200 transition-all transform active:scale-98">
          <Play className="w-5 h-5 fill-white" />
          <span>ゲームスタート (全5問)</span>
        </button>
        <button type="button" onClick={onOpenSettings} className="w-full py-3 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-2">
  <Settings className="w-4 h-4" />
  <span>設定</span>
</button>

        
      </div>
    </div>
  );
};
