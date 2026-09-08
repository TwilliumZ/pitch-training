import React, { useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { NoteInfo } from '../types';
import { playNoteSound } from '../utils/audioSynthesizer';
import { AnswerStaff } from './AnswerStaff';

interface AnswerReviewPlayerProps {
  /** 回答した音階（回答順。App の history から派生させる） */
  notes: NoteInfo[];
  /** 各音の正誤（省略可） */
  correctFlags?: (boolean | undefined)[];
  /** 見出し（省略時は自分の回答の楽譜） */
  title?: string;
  /** 再生ボタンの文言（省略時は自分の回答を聴き直す） */
  playLabel?: string;
}

const STEP_MS = 650;

/**
 * 自分の回答の楽譜表示と聴き直し再生（機能4）。
 * 既存の playNoteSound を再利用し、タイマー破棄で確実に停止する。
 */
export const AnswerReviewPlayer: React.FC<AnswerReviewPlayerProps> = ({
  notes,
  correctFlags,
  title = '自分の回答の楽譜',
  playLabel = '自分の回答を聴き直す',
}) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const stop = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setPlayingIndex(null);
  };

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const handlePlay = () => {
    if (playingIndex !== null) {
      stop();
      return;
    }
    notes.forEach((note, i) => {
      const t = window.setTimeout(() => {
        playNoteSound(note.frequency, 0.8, 'piano');
        setPlayingIndex(i);
        if (i === notes.length - 1) {
          const end = window.setTimeout(() => setPlayingIndex(null), STEP_MS);
          timersRef.current.push(end);
        }
      }, i * STEP_MS);
      timersRef.current.push(t);
    });
  };

  if (notes.length === 0) return null;
  const playing = playingIndex !== null;

  return (
    <div className="bg-moss-50/60 rounded-2xl p-4 border border-moss-100 text-left space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </h4>
        <button
          id="btn-review-answers"
          type="button"
          onClick={handlePlay}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5 ${
            playing
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-moss-500 hover:bg-moss-600 text-white'
          }`}
        >
          {playing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>
            {playing ? `停止（${playingIndex + 1}/${notes.length}）` : playLabel}
          </span>
        </button>
      </div>
      <div className="bg-white rounded-xl border border-moss-100 px-2 py-1">
        <AnswerStaff
          notes={notes}
          correctFlags={correctFlags}
          highlightIndex={playingIndex ?? undefined}
        />
      </div>
    </div>
  );
};
