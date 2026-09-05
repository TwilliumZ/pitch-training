import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Music } from 'lucide-react';
import { NoteInfo, VoiceInputMode } from '../types';
import { matchSpeechToChoice } from '../utils/voiceManager';
import { autoCorrelate, frequencyToMidi, getAudioContext } from '../utils/audioSynthesizer';
import { ALL_NOTES } from '../utils/notesData';

interface VoiceAnswerControllerProps {
  choices: NoteInfo[];
  onSelectNote: (note: NoteInfo, via: 'voice_speech' | 'voice_singing', rawText?: string) => void;
  disabled?: boolean;
}

export const VoiceAnswerController: React.FC<VoiceAnswerControllerProps> = ({
  choices,
  onSelectNote,
  disabled = false,
}) => {
  const [mode, setMode] = useState<VoiceInputMode>('speech');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [detectedPitchNote, setDetectedPitchNote] = useState<{ noteName: string; freq: number } | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio / Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pitchHoldRef = useRef<{ noteId: string; count: number }>({ noteId: '', count: 0 });

  // 1. Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onresult = (event: any) => {
        if (disabled) return;
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const heard = (finalTranscript || interimTranscript).trim();
        if (heard) {
          setTranscript(heard);
          // Attempt match with choices
          const match = matchSpeechToChoice(heard, choices);
          if (match) {
            onSelectNote(match.matchedNote, 'voice_speech', heard);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setMicPermissionState('denied');
          setErrorMessage('マイクのアクセスがブロックされています。ブラウザの設定で許可してください。');
        } else if (event.error !== 'no-speech') {
          console.warn('Speech recognition event error:', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if listening and not disabled
        if (isListening && !disabled) {
          try {
            recognition.start();
          } catch {
            // Ignore restart collisions
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setErrorMessage('お使いのブラウザは音声認識APIに対応していません。選択肢をクリックして回答できます。');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [choices, disabled, onSelectNote, isListening]);

  // 2. Microphone Stream & Pitch Detection Setup
  const startMicAudio = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      audioStreamRef.current = stream;
      setMicPermissionState('granted');
      setIsListening(true);

      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start Web Speech Recognition if available
      if (recognitionRef.current && (mode === 'speech' || mode === 'both')) {
        try {
          recognitionRef.current.start();
        } catch {
          // May already be active
        }
      }

      // Start Audio Visualizer & Pitch Loop
      const buf = new Float32Array(analyser.fftSize);
      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);

        const { freq, rms } = autoCorrelate(buf, ctx.sampleRate);
        setMicVolume(Math.min(1, rms * 8));

        // If in singing/pitch mode, evaluate pitch
        if ((mode === 'pitch' || mode === 'both') && !disabled) {
          if (freq > 0) {
            const { midi } = frequencyToMidi(freq);
            const foundNote = ALL_NOTES.find((n) => n.midiNumber === midi);
            if (foundNote) {
              setDetectedPitchNote({ noteName: `${foundNote.nameJa} (${foundNote.nameEn})`, freq: Math.round(freq) });

              // Pitch stabilization check (hold for ~6 frames)
              if (pitchHoldRef.current.noteId === foundNote.id) {
                pitchHoldRef.current.count += 1;
                if (pitchHoldRef.current.count >= 6) {
                  // Check if this matches one of the 4 choices!
                  const matchedChoice = choices.find((c) => c.id === foundNote.id);
                  if (matchedChoice) {
                    onSelectNote(matchedChoice, 'voice_singing', `歌声ピッチ ${Math.round(freq)}Hz`);
                    pitchHoldRef.current = { noteId: '', count: 0 };
                  }
                }
              } else {
                pitchHoldRef.current = { noteId: foundNote.id, count: 1 };
              }
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      animationFrameRef.current = requestAnimationFrame(checkAudio);
    } catch (err: any) {
      console.warn('Microphone access failed:', err);
      setMicPermissionState('denied');
      setErrorMessage('マイクの許可が必要です。ブラウザの設定でマイクを許可するか、選択肢をクリックして回答してください。');
      setIsListening(false);
    }
  };

  const stopMicAudio = () => {
    setIsListening(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setMicVolume(0);
    setTranscript('');
    setDetectedPitchNote(null);
  };

  // Start mic automatically when component mounts if not disabled
  useEffect(() => {
    if (!disabled && micPermissionState !== 'denied') {
      startMicAudio();
    }
    return () => {
      stopMicAudio();
    };
  }, [disabled]);

  return (
    <div className="w-full bg-slate-900/80 rounded-2xl p-4 border border-indigo-500/20 shadow-lg space-y-3">
      {/* Header bar: Mic status and Mode toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Active Mic Indicator */}
          <button
            type="button"
            onClick={isListening ? stopMicAudio : startMicAudio}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              isListening
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            {isListening ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>音声入力中 (声で解答)</span>
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4 text-rose-400" />
                <span>マイク停止中 (クリックで開始)</span>
              </>
            )}
          </button>

          {/* Mode Selector */}
          <div className="inline-flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setMode('speech')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                mode === 'speech' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="声で『ド』『レ』『1番』などと言って解答"
            >
              発声認識
            </button>
            <button
              type="button"
              onClick={() => setMode('pitch')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                mode === 'pitch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="声やハミングで歌って解答"
            >
              歌声ピッチ
            </button>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          ※ 画面の選択肢をクリックしても解答できます
        </span>
      </div>

      {/* Real-time Visualizer & Transcript bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950/60 rounded-xl p-3 border border-slate-800/70">
        {/* Dynamic Mic Waveform meter */}
        <div className="flex items-center gap-1 h-6 shrink-0">
          {[0.2, 0.5, 0.9, 0.4, 0.8, 1.0, 0.6, 0.3].map((multiplier, idx) => {
            const h = Math.max(4, micVolume * multiplier * 24);
            return (
              <div
                key={idx}
                className="w-1.5 rounded-full bg-emerald-400 transition-all duration-75"
                style={{
                  height: isListening ? `${h}px` : '4px',
                  opacity: isListening ? 0.4 + micVolume * 0.6 : 0.2,
                }}
              />
            );
          })}
        </div>

        {/* Live recognition feedback text */}
        <div className="flex-1 text-center sm:text-left overflow-hidden">
          {mode === 'speech' ? (
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs">
              <span className="text-slate-400">マイクの音声:</span>
              {transcript ? (
                <span className="font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30 truncate max-w-[280px]">
                  「{transcript}」
                </span>
              ) : (
                <span className="text-slate-400 italic">
                  「ド」「ミ」「1番」などと発声してください...
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs">
              <Music className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">歌声ピッチ:</span>
              {detectedPitchNote ? (
                <span className="font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
                  {detectedPitchNote.noteName} ({detectedPitchNote.freq}Hz)
                </span>
              ) : (
                <span className="text-slate-400 italic">
                  マイクに向かって声で音程を歌ってください（アー、ウーなど）...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-2">
          <Volume2 className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
