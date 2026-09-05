import React, { useState } from 'react';
import { Volume2, RefreshCw, Radio } from 'lucide-react';
import { NoteInfo } from '../types';
import { playNoteSound } from '../utils/audioSynthesizer';

interface SoundPlayerCardProps {
  targetNote: NoteInfo;
  isPlaying: boolean;
  onPlaySound: () => void;
  replayCount: number;
}

export const SoundPlayerCard: React.FC<SoundPlayerCardProps> = ({
  targetNote,
  isPlaying,
  onPlaySound,
  replayCount,
}) => {
  const [instrument, setInstrument] = useState<'piano' | 'bell'>('piano');

  const handlePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playNoteSound(targetNote.frequency, 1.5, instrument);
    onPlaySound();
  };

  return (
    <div className="w-full bg-gradient-to-b from-slate-800/80 to-slate-900/90 rounded-3xl p-6 border border-slate-700/70 shadow-xl relative overflow-hidden text-center">
      {/* Background glow when audio plays */}
      <div
        className={`absolute inset-0 bg-indigo-600/10 transition-opacity duration-500 pointer-events-none ${
          isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Top instruction badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-3">
        <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
        <span>コンピュータから問題の音が出題されています</span>
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
        この音は何の音でしょう？
      </h2>
      <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-5">
        音をよく聴いて、下の4つの選択肢の中から正解の音を選んでタップしてください！
      </p>

      {/* Big Interactive Audio Speaker / Play Button */}
      <div className="flex flex-col items-center justify-center my-2">
        <button
          id="btn-replay-sound"
          type="button"
          onClick={handlePlay}
          className={`group relative p-6 sm:p-8 rounded-full transition-all duration-300 transform active:scale-95 shadow-lg ${
            isPlaying
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 ring-8 ring-indigo-500/30 scale-105'
              : 'bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 hover:ring-4 hover:ring-indigo-500/20'
          }`}
          title="クリックして音を再生"
        >
          {/* Animated sound wave ripples */}
          {isPlaying && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-60" />
              <span className="absolute -inset-2 rounded-full border border-purple-400 animate-pulse opacity-40" />
            </>
          )}

          <Volume2
            className={`w-10 h-10 sm:w-12 sm:h-12 text-white transition-transform ${
              isPlaying ? 'animate-bounce' : 'group-hover:scale-110'
            }`}
          />
        </button>

        {/* Audio Equalizer visualizer */}
        <div className="flex items-center gap-1.5 mt-4 h-6">
          {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4, 0.8, 0.5, 0.7, 0.3].map((heightRatio, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-200 ${
                isPlaying ? 'bg-indigo-400' : 'bg-slate-700'
              }`}
              style={{
                height: isPlaying ? `${Math.max(6, heightRatio * 24)}px` : '4px',
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>

        {/* Replay action & Timbre switch */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePlay}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isPlaying ? 'animate-spin' : ''}`} />
            <span>もう一度聴く</span>
            {replayCount > 0 && (
              <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
                {replayCount}回目
              </span>
            )}
          </button>

          {/* Tone Selector */}
          <div className="flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setInstrument('piano');
                playNoteSound(targetNote.frequency, 1.4, 'piano');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                instrument === 'piano'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ピアノ音
            </button>
            <button
              type="button"
              onClick={() => {
                setInstrument('bell');
                playNoteSound(targetNote.frequency, 1.4, 'bell');
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                instrument === 'bell'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ベル音
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
