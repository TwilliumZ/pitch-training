export interface NoteInfo {
  id: string;
  nameJa: string;        // 'ド', 'レ', 'ミ', etc.
  nameEn: string;        // 'C4', 'D4', etc.
  solfege: string;       // 'Do', 'Re', 'Mi', etc.
  octave: number;        // 4
  midiNumber: number;    // 60 for C4, 69 for A4
  frequency: number;     // 261.63, 440, etc.
  isAccidental: boolean; // sharp/flat
  color: string;         // theme color for UI
  voiceKeywords: string[]; // voice recognition aliases: ['ド', 'ど', 'c', 'シー', '1番']
}

export interface GameQuestion {
  id: string;
  questionNumber: number; // 1 to 5
  targetNote: NoteInfo;
  choices: NoteInfo[];
  timeLimitSec: number;
}

export interface AnswerResult {
  questionNumber: number;
  targetNote: NoteInfo;
  chosenNote: NoteInfo;
  semitoneDiff: number;
  closenessScore: number;
  speedBonus: number;
  streakBonus: number;
  totalRoundScore: number;
  timeTakenSec: number;
  isExact: boolean;
  streakCountAfter: number;
  answeredVia: 'voice_speech' | 'voice_singing' | 'click';
  rawInputText?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  totalScore: number;
  perfectCount: number;
  maxStreak: number;
  averageTimeSec: number;
  difficulty: 'standard' | 'advanced';
  date: string;
}

export type GameDifficulty = 'standard' | 'advanced';
export type VoiceInputMode = 'speech' | 'pitch' | 'both';
export type GameScreen = 'start' | 'reference_tone' | 'playing' | 'round_result' | 'game_over' | 'ranking';
