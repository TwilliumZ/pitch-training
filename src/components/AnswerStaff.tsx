import React from 'react';
import { NoteInfo } from '../types';

interface AnswerStaffProps {
  /** 表示する音階（回答順） */
  notes: NoteInfo[];
  /** 各音の正誤（true=正解・false=不正解・省略=中立色） */
  correctFlags?: (boolean | undefined)[];
  /** 再生中の強調位置（省略可） */
  highlightIndex?: number;
}

const STEP_LETTER_INDEX: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

const LINE_GAP = 12;
const STEP_DY = LINE_GAP / 2;
const STAFF_TOP = 60;
/** ト音記号の第1線（E4）の通番号 */
const E4_DIATONIC = 4 * 7 + 2;

function diatonicOf(note: NoteInfo): number {
  const letter = note.nameEn.charAt(0).toUpperCase();
  const step = STEP_LETTER_INDEX[letter] ?? 0;
  return note.octave * 7 + step;
}

function yOf(diatonic: number): number {
  const bottomLineY = STAFF_TOP + LINE_GAP * 4;
  return bottomLineY - (diatonic - E4_DIATONIC) * STEP_DY;
}

/** 必要な加線の通番号一覧 */
function ledgerLinesOf(diatonic: number): number[] {
  const lines: number[] = [];
  if (diatonic < E4_DIATONIC) {
    for (let line = E4_DIATONIC - 2; line > diatonic - 2; line -= 2) {
      lines.push(line);
    }
  } else if (diatonic > E4_DIATONIC + 8) {
    for (let line = E4_DIATONIC + 10; line < diatonic + 2; line += 2) {
      lines.push(line);
    }
  }
  return lines;
}

/**
 * 回答履歴の五線譜表示（機能4・軽量SVG描画）。
 * 既存の採点や State には触らず、渡された音階配列の描画だけを担当する。
 */
export const AnswerStaff: React.FC<AnswerStaffProps> = ({
  notes,
  correctFlags,
  highlightIndex,
}) => {
  const noteWidth = 64;
  const leftPad = 64;
  const rightPad = 24;
  const width = Math.max(320, leftPad + notes.length * noteWidth + rightPad);
  const height = 190;
  const staffRight = width - 12;
  const middleLineY = STAFF_TOP + LINE_GAP * 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="回答の五線譜"
    >
      {/* Staff lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={10}
          y1={STAFF_TOP + i * LINE_GAP}
          x2={staffRight}
          y2={STAFF_TOP + i * LINE_GAP}
          stroke="#94a3b8"
          strokeWidth={1.5}
        />
      ))}
      {/* Treble clef */}
      <text x={16} y={STAFF_TOP + 44} fontSize={56} fill="#235237" aria-hidden="true">
        𝄞
      </text>

      {notes.map((note, i) => {
        const d = diatonicOf(note);
        const y = yOf(d);
        const x = leftPad + i * noteWidth + noteWidth / 2;
        const stemUp = y >= middleLineY;
        const isSharp = note.nameEn.includes('#');
        const flag = correctFlags?.[i];
        const headFill =
          highlightIndex === i ? '#357a4c' : flag === true ? '#059669' : flag === false ? '#f43f5e' : '#1e293b';

        return (
          <g key={`${note.id}-${i}`}>
            {/* Ledger lines */}
            {ledgerLinesOf(d).map((line) => (
              <line
                key={line}
                x1={x - 12}
                y1={yOf(line)}
                x2={x + 12}
                y2={yOf(line)}
                stroke="#94a3b8"
                strokeWidth={1.5}
              />
            ))}
            {/* Question number */}
            <text x={x} y={26} fontSize={11} fontWeight="bold" fill="#64748b" textAnchor="middle">
              Q{i + 1}
            </text>
            {/* Accidental */}
            {isSharp && (
              <text x={x - 20} y={y + 6} fontSize={20} fill="#1e293b" textAnchor="middle">
                ♯
              </text>
            )}
            {/* Note head */}
            <ellipse
              cx={x}
              cy={y}
              rx={7.5}
              ry={5.2}
              fill={headFill}
              transform={`rotate(-18 ${x} ${y})`}
              stroke={highlightIndex === i ? '#235237' : 'none'}
              strokeWidth={2}
            />
            {/* Stem */}
            <line
              x1={stemUp ? x + 6.5 : x - 6.5}
              y1={y}
              x2={stemUp ? x + 6.5 : x - 6.5}
              y2={stemUp ? y - 38 : y + 38}
              stroke={headFill}
              strokeWidth={2}
            />
            {/* Note name */}
            <text x={x} y={height - 22} fontSize={13} fontWeight="bold" fill="#334155" textAnchor="middle">
              {note.nameJa}
            </text>
            <text x={x} y={height - 8} fontSize={10} fill="#94a3b8" textAnchor="middle">
              {note.nameEn}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
