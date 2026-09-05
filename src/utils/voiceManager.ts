import { NoteInfo } from '../types';

/**
 * Helper to speak text using browser Web Speech Synthesis.
 */
export function speakText(text: string, enabled: boolean = true): Promise<void> {
  return new Promise((resolve) => {
    if (!enabled || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 1.05;
      utterance.pitch = 1.1;

      // Select Japanese voice if available
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find((v) => v.lang.startsWith('ja'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

/**
 * Normalize and match speech transcription against available note choices.
 */
export function matchSpeechToChoice(
  transcript: string,
  choices: NoteInfo[]
): { matchedNote: NoteInfo; matchedText: string } | null {
  const normalized = transcript.trim().toLowerCase().replace(/\s+/g, '');

  // 1. Direct index matching (1番, 2番, 一番, 二番, A, B, C, D)
  const indexMatches: { patterns: string[]; index: number }[] = [
    { patterns: ['1番', '一番', 'いちばん', '1', 'a', 'エー', 'えー', '最初の', 'ひとつめ'], index: 0 },
    { patterns: ['2番', '二番', 'にばん', '2', 'b', 'ビー', 'びー', 'ふたつめ'], index: 1 },
    { patterns: ['3番', '三番', 'さんばん', '3', 'c', 'シー', 'しー', 'みっつめ'], index: 2 },
    { patterns: ['4番', '四番', 'よんばん', '4', 'd', 'ディー', 'でぃー', 'よっつめ'], index: 3 },
  ];

  for (const item of indexMatches) {
    if (choices[item.index] && item.patterns.some((p) => normalized.includes(p))) {
      return { matchedNote: choices[item.index], matchedText: transcript };
    }
  }

  // 2. Note name & keyword matching
  for (const note of choices) {
    for (const kw of note.voiceKeywords) {
      const cleanKw = kw.toLowerCase();
      if (normalized.includes(cleanKw)) {
        return { matchedNote: note, matchedText: kw };
      }
    }
  }

  return null;
}
