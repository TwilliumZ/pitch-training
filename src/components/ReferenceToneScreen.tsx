import React, { useState, useEffect } from 'react';
import { Volume2, Play, ArrowRight, Music, RefreshCw } from 'lucide-react';
import { playNoteSound } from '../utils/audioSynthesizer';
import { speakText } from '../utils/voiceManager';

interface ReferenceToneScreenProps {
  onProceedToQuestion: () => void;
  speechEnabled: boolean;
}

export const ReferenceToneScreen: React.FC<ReferenceToneScreenProps> = ({
  onProceedToQuestion,
  speechEnabled,
}) => {
  // Reference pitch is Middle C (ド / C4 / 261.63Hz) and standard A4 (ラ / 440Hz)
  const [activeNote, setActiveNote] = useState<'C4' | 'A4'>('C4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const referenceNotes = [
    {
      id: 'C4' as const,
      nameJa: 'ド',
      nameEn: 'C4',
      solfege: 'Do',
      freq: 261.63,
      desc: '基本の「ド」の音（中央ハ音）。音階の起点となる基準音です。',
      color: 'from-rose-500 to-red-600',
      border: 'border-rose-500/40',
      activeBorder: 'border-rose-400 ring-4 ring-rose-500/30',
    },
    {
      id: 'A4' as const,
      nameJa: 'ラ',
      nameEn: 'A4',
      solfege: 'La',
      freq: 440.0,
      desc: 'チューニング標準音（440Hz）。楽器の調律で世界標準となる音です。',
      color: 'from-moss-500 to-moss-700',
      border: 'border-moss-500/40',
      activeBorder: 'border-moss-400 ring-4 ring-moss-500/30',
    },
  ];

  const currentRef = referenceNotes.find((n) => n.id === activeNote) || referenceNotes[0];

  const playTone = (note = currentRef) => {
    setIsPlaying(true);
    playNoteSound(note.freq, 2.0, 'piano');
    setTimeout(() => {
      setIsPlaying(false);
    }, 2000);
  };

  // Automatically play reference tone on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      playTone(referenceNotes[0]);
      if (speechEnabled) {
        speakText('第一問の前に、基準の音をお聴きください。基準のドです。', true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto bg-white backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-moss-200 shadow-xl shadow-moss-100 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Badge Header */}
      <div className="flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-moss-100 text-moss-700 border border-moss-200 text-xs font-bold mb-3">
          <Music className="w-3.5 h-3.5 text-moss-600" />
          <span>出題前の基準音確認</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          第一問の前に、基準の音を聴きましょう
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
          この基準音（ドの音・ラの音）の高さを耳で覚えてから、出題される問題に挑戦してください。
        </p>
      </div>

      {/* Selector between C4 (Do) and A4 (La) */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {referenceNotes.map((note) => {
          const isSelected = activeNote === note.id;
          return (
            <button
              key={note.id}
              id={`ref-note-${note.id}`}
              type="button"
              onClick={() => {
                setActiveNote(note.id);
                playTone(note);
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? `bg-moss-50 ${note.activeBorder} shadow-lg`
                  : 'bg-white hover:bg-moss-50 border-moss-200 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {note.nameEn}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{note.freq}Hz</span>
              </div>
              <div className="text-2xl font-black text-slate-800">{note.nameJa}（{note.solfege}）</div>
              <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{note.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Main Sound Wave & Play Button Card */}
      <div className="p-6 bg-moss-50/60 rounded-2xl border border-moss-100 flex flex-col items-center justify-center relative overflow-hidden">
        <div
          className={`absolute inset-0 bg-moss-200/40 transition-opacity duration-300 pointer-events-none ${
            isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div className="relative z-10 flex flex-col items-center space-y-3">
          <button
            id="btn-play-reference-tone"
            type="button"
            onClick={() => playTone()}
            className={`p-6 rounded-full transition-all duration-200 active:scale-95 shadow-xl cursor-pointer ${
              isPlaying
                ? 'bg-moss-500 ring-8 ring-moss-200 scale-105 text-white'
                : 'bg-moss-500 hover:bg-moss-600 text-white hover:ring-4 hover:ring-moss-200'
            }`}
            title="基準音をもう一度聴く"
          >
            <Volume2 className={`w-8 h-8 ${isPlaying ? 'animate-pulse' : ''}`} />
          </button>

          <div>
            <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
              <span>基準音: {currentRef.nameJa} ({currentRef.nameEn} - {currentRef.freq}Hz)</span>
              {isPlaying && <span className="text-xs text-moss-600 animate-pulse font-normal">♪ 再生中...</span>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ボタンを押すと何度でも基準音を聴き直せます
            </p>
          </div>
        </div>
      </div>

      {/* Proceed Button */}
      <div className="pt-2">
        <button
          id="btn-start-question-1"
          type="button"
          onClick={onProceedToQuestion}
          className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg bg-moss-500 hover:bg-moss-600 text-white shadow-xl shadow-moss-200 flex items-center justify-center gap-2.5 transition-all duration-200 transform active:scale-98 cursor-pointer"
        >
          <span>基準音を覚えた！第1問を出題する</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-[11px] text-slate-500 mt-2">
          選択肢をタップまたはキーボード（1〜4キー）で解答できます
        </p>
      </div>
    </div>
  );
};
