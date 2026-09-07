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
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-moss-500"></span>
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
                  ? 'bg-moss-500 border-moss-500 ring-4 ring-moss-200 shadow-xl scale-102'
                  : 'bg-white hover:bg-moss-50 border-moss-200 hover:border-moss-400 shadow-lg hover:shadow-moss-200'
              } ${disabled ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Header Badge: 1 (A) & sound preview */}
              <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold px-2.5 py-0.5 rounded-lg bg-moss-50 border border-moss-200 text-moss-700 text-xs shadow-inner">
                  {label.num}
                </span>

                {/* Sound preview button */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handlePreview(e, note)}
                  className="p-1.5 rounded-lg hover:bg-moss-100 text-slate-400 hover:text-moss-700 transition-colors"
                  title="この選択肢の音を試し聴き"
                >
                  <Volume1 className="w-4 h-4" />
                </span>
              </div>

              {/* Large Note Name */}
              <div className="my-2.5">
                <span className={`text-3xl sm:text-4xl font-black tracking-tight group-hover:scale-105 transition-transform block ${
                  isSelected ? 'text-white' : 'text-slate-800'
                }`}>
                  {note.nameJa}
                </span>
                <span className={`text-xs font-semibold mt-1 block ${
                  isSelected ? 'text-moss-50' : 'text-slate-500'
                }`}>
                  {note.nameEn} ({note.solfege})
                </span>
              </div>

              {/* Action Prompt */}
              <div className={`w-full mt-2 pt-2 border-t flex items-center justify-center gap-1 text-[11px] font-medium ${
                isSelected
                  ? 'border-moss-400 text-white'
                  : 'border-moss-100 text-moss-600 group-hover:text-moss-700'
              }`}>
                <span>タップして解答</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
