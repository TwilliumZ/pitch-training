import React from 'react';
import { NoteInfo } from '../types';
import { playNoteSound } from '../utils/audioSynthesizer';
import { Volume1 } from 'lucide-react';

interface ChoicesGridProps {
  choices: NoteInfo[];
  selectedNote: NoteInfo | null;
  onSelect: (note: NoteInfo, via: 'click') => void;
  disabled?: boolean;
}

const INDEX_LABELS = [
  { num: '1', alpha: 'A', spoken: '1番' },
  { num: '2', alpha: 'B', spoken: '2番' },
  { num: '3', alpha: 'C', spoken: '3番' },
  { num: '4', alpha: 'D', spoken: '4番' },
];

export const ChoicesGrid: React.FC<ChoicesGridProps> = ({
  choices,
  selectedNote,
  onSelect,
  disabled = false,
}) => {
  const handlePreview = (e: React.MouseEvent, note: NoteInfo) => {
    e.stopPropagation();
    if (!disabled) {
      playNoteSound(note.frequency, 0.7, 'piano');
    }
  };

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-400"></span>
          <span>選択肢から正解を選んでタップしてください</span>
        </span>
        <span className="text-[11px] text-slate-400 font-mono">キーボード [1] [2] [3] [4] キー</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {choices.map((note, index) => {
          const isSelected = selectedNote?.id === note.id;
          const label = INDEX_LABELS[index] || { num: `${index + 1}`, alpha: '?', spoken: `${index + 1}番` };

          return (
            <button
              key={note.id}
              id={`choice-btn-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(note, 'click')}
              className={`group relative flex flex-col items-center justify-between p-5 rounded-2xl border text-center transition-all duration-200 transform active:scale-95 ${
                isSelected
                  ? 'bg-indigo-600/40 border-indigo-400 ring-4 ring-indigo-500/40 shadow-xl scale-102'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 hover:border-indigo-400/60 shadow-lg hover:shadow-indigo-500/20'
              } ${disabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Header Badge: 1 (A) & sound preview */}
              <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-bold px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs shadow-inner">
                  {label.num}
                </span>

                {/* Sound preview button */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handlePreview(e, note)}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="この選択肢の音を試し聴き"
                >
                  <Volume1 className="w-4 h-4" />
                </span>
              </div>

              {/* Large Note Name */}
              <div className="my-2.5">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight group-hover:scale-105 transition-transform block">
                  {note.nameJa}
                </span>
                <span className="text-xs font-semibold text-slate-400 mt-1 block">
                  {note.nameEn} ({note.solfege})
                </span>
              </div>

              {/* Action Prompt */}
              <div className="w-full mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-center gap-1 text-[11px] text-indigo-300 font-medium group-hover:text-white">
                <span>タップして解答</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
