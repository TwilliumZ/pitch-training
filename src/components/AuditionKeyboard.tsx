import React, { useState } from 'react';
import { Piano } from 'lucide-react';
import { NoteInfo } from '../types';
import { ALL_NOTES } from '../utils/notesData';
import { playNoteSound } from '../utils/audioSynthesizer';

interface AuditionKeyboardProps {
  /** 押した鍵盤の通知（採点には使わず、履歴表示などの拡張用） */
  onAudition?: (note: NoteInfo) => void;
  disabled?: boolean;
}

const WHITE_KEY_IDS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const BLACK_KEY_AFTER: Record<string, string> = {
  C4: 'Cs4',
  D4: 'Ds4',
  F4: 'Fs4',
  G4: 'Gs4',
  A4: 'As4',
};

function findNote(id: string): NoteInfo | undefined {
  return ALL_NOTES.find((n) => n.id === id);
}

/**
 * 音確認用の鍵盤UI（機能2）。
 * 既存の playNoteSound を再利用して試聴だけ行い、採点状態には触らない。
 */
export const AuditionKeyboard: React.FC<AuditionKeyboardProps> = ({
  onAudition,
  disabled = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handlePress = (note: NoteInfo | undefined) => {
    if (!note || disabled) return;
    playNoteSound(note.frequency, 0.9, 'piano');
    setActiveId(note.id);
    window.setTimeout(() => {
      setActiveId((current) => (current === note.id ? null : current));
    }, 350);
    onAudition?.(note);
  };

  return (
    <div className="w-full bg-white rounded-2xl p-3 border border-moss-200 shadow-sm shadow-moss-100 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
        <Piano className="w-4 h-4 text-moss-600" />
        <span>音の確認（自由にタップして試聴できます）</span>
      </div>
      <div className="relative flex select-none" role="group" aria-label="音確認鍵盤">
        {WHITE_KEY_IDS.map((id) => {
          const note = findNote(id);
          const blackId = BLACK_KEY_AFTER[id];
          const black = blackId ? findNote(blackId) : undefined;
          const isActive = activeId === id;
          return (
            <div key={id} className="relative flex-1">
              <button
                type="button"
                disabled={disabled || !note}
                onClick={() => handlePress(note)}
                className={`w-full h-28 rounded-b-xl border text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-moss-500 border-moss-500 text-white'
                    : 'bg-white border-moss-200 text-slate-600 hover:bg-moss-50'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label={note ? `${note.nameJa}の音を確認` : id}
              >
                <span className="absolute bottom-1.5 left-0 right-0 text-center">
                  {note?.nameJa}
                </span>
              </button>
              {black && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePress(black)}
                  className={`absolute -right-3.5 top-0 w-7 h-[4.5rem] rounded-b-lg text-[10px] font-bold transition-all z-10 ${
                    activeId === black.id
                      ? 'bg-moss-600 text-white'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={`${black.nameJa}の音を確認`}
                >
                  <span className="absolute bottom-1 left-0 right-0 text-center">
                    {black.nameJa}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
