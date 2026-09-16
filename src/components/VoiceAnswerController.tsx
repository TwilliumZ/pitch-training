import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mic, MicOff, RotateCcw, ServerCrash } from 'lucide-react';
import { mutePlaybackForRecording, unmutePlaybackAfterRecording } from '../utils/audioSynthesizer';
import type { NoteInfo } from '../types';
import { AnswerStaff } from './AnswerStaff';
import { encodeMonoWav, noteFromDetectedMidi, recognizePitch } from '../utils/pitchRecognition';

interface VoiceAnswerControllerProps {
  onSelectNote: (note: NoteInfo, via: 'voice_singing', rawText?: string, confidence?: number) => void;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'preparing' | 'recording' | 'analyzing';
// 発声開始の反応時間を含め、約2秒の持続音を収録する余裕を取る。
const RECORDING_MS = 3000;

export const VoiceAnswerController: React.FC<VoiceAnswerControllerProps> = ({ onSelectNote, disabled = false }) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [detectedNote, setDetectedNote] = useState<NoteInfo | null>(null);
  const [detectedFrequency, setDetectedFrequency] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sessionRef = useRef(0);
  const busyRef = useRef(false);
  const playbackMutedRef = useRef(false);

  const releaseRecorder = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (processorRef.current) processorRef.current.port.onmessage = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const context = contextRef.current;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    if (playbackMutedRef.current) {
      unmutePlaybackAfterRecording();
      playbackMutedRef.current = false;
    }
    setMicLevel(0);
  };

  useEffect(() => () => {
    sessionRef.current += 1;
    releaseRecorder();
    abortRef.current?.abort();
  }, []);

  const finishRecording = async () => {
    const sampleRate = contextRef.current?.sampleRate ?? 48_000;
    const chunks = samplesRef.current;
    releaseRecorder();
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const samples = new Float32Array(totalLength);
    let offset = 0;
    chunks.forEach((chunk) => {
      samples.set(chunk, offset);
      offset += chunk.length;
    });
    if (samples.length < sampleRate / 4) {
      busyRef.current = false;
      setState('idle');
      setErrorMessage('録音が短すぎます。マイクに向かって約2秒発声してください。');
      return;
    }
    setState('analyzing');
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const result = await recognizePitch(encodeMonoWav(samples, sampleRate), abort.signal);
      const note = noteFromDetectedMidi(result.midiNumber);
      if (!note) throw new Error(`検出した音（${result.noteName}）は出題範囲外です。中央のド〜高いドで発声してください。`);
      if (abort.signal.aborted) return;
      setDetectedNote(note);
      setDetectedFrequency(result.frequencyHz);
      setErrorMessage(null);
      onSelectNote(note, 'voice_singing', `${result.frequencyHz.toFixed(1)}Hz`, result.confidence);
    } catch (error) {
      if (abort.signal.aborted) return;
      if ((error as Error).name !== 'AbortError') setErrorMessage((error as Error).message);
      busyRef.current = false;
      setState('idle');
    }
  };

  const startRecording = async () => {
    if (disabled || busyRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('このブラウザはマイク録音に対応していません。');
      return;
    }
    busyRef.current = true;
    const session = ++sessionRef.current;
    setState('preparing');
    setErrorMessage(null);
    setDetectedNote(null);
    setDetectedFrequency(null);
    samplesRef.current = [];
    try {
      playbackMutedRef.current = true;
      await mutePlaybackForRecording();
      if (session !== sessionRef.current) return;
      // 持続する歌声を「背景ノイズ」として除去しないよう音声補正を無効化する。
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const context = new AudioContext();
      contextRef.current = context;
      if (!context.audioWorklet) {
        throw new Error('音声回答にはAudioWorklet対応ブラウザとHTTPS（またはlocalhost）が必要です。');
      }
      await context.resume();
      await context.audioWorklet.addModule(new URL('../utils/recordingProcessor.js', import.meta.url).href);
      if (session !== sessionRef.current) return;
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, 'recording-processor');
      processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const chunk = event.data;
        samplesRef.current.push(chunk);
        const rms = Math.sqrt(chunk.reduce((sum, value) => sum + value * value, 0) / chunk.length);
        setMicLevel(Math.min(1, rms * 10));
      };
      sourceRef.current = source;
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(context.destination);
      setState('recording');
      timeoutRef.current = window.setTimeout(() => void finishRecording(), RECORDING_MS);
    } catch (error) {
      if (session !== sessionRef.current) return;
      releaseRecorder();
      busyRef.current = false;
      setState('idle');
      setErrorMessage(error instanceof Error && error.message.includes('AudioWorklet')
        ? error.message
        : 'マイクを開始できません。ブラウザのサイト設定でマイクを許可してください。');
    }
  };

  return (
    <section className="w-full rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3" aria-label="音声回答">
      <div className="text-center"><p className="text-sm font-black text-indigo-900">マイクに向かって指定された高さの音を発声</p><p className="text-xs text-indigo-600 mt-1">録音中の表示が出たら「アー」など、一定の声を約2秒伸ばしてください（録音は3秒）</p></div>
      <p className="text-center text-xs text-indigo-600">イヤホン推奨。声域に合わせて別のオクターブでも回答できます。</p>
      {detectedNote && <div className="rounded-xl border border-emerald-200 bg-white px-3 pt-2 text-center" role="status"><p className="text-xs font-bold text-emerald-700">認識した音: {detectedNote.nameJa}（{detectedNote.nameEn} / {detectedFrequency?.toFixed(1)}Hz）</p><div className="max-w-xs mx-auto"><AnswerStaff notes={[detectedNote]} labels={['回答']} /></div></div>}
      <button type="button" onClick={() => void startRecording()} disabled={disabled || state !== 'idle'} className={`w-full min-h-16 rounded-2xl font-black flex items-center justify-center gap-3 transition-all ${state === 'recording' ? 'bg-rose-500 text-white' : state === 'analyzing' ? 'bg-indigo-300 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} disabled:cursor-not-allowed`}>
        {state === 'recording' ? <><Mic className="w-6 h-6" /><span>録音中… 声を伸ばしてください</span></> : state === 'analyzing' ? <><LoaderCircle className="w-6 h-6 animate-spin" /><span>音高を解析中…</span></> : state === 'preparing' ? <><LoaderCircle className="w-6 h-6 animate-spin" /><span>マイクを準備中…</span></> : <><MicOff className="w-6 h-6" /><span>{errorMessage ? 'もう一度録音する' : 'タップして音声で回答'}</span></>}
      </button>
      {state === 'recording' && <div className="h-2 rounded-full bg-indigo-100 overflow-hidden" aria-label="マイク入力レベル"><div className="h-full bg-rose-500 transition-all duration-75" style={{ width: `${Math.max(3, micLevel * 100)}%` }} /></div>}
      {errorMessage && <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2" role="alert">{errorMessage.includes('サーバー') || errorMessage.includes('解析') ? <ServerCrash className="w-4 h-4 shrink-0" /> : <RotateCcw className="w-4 h-4 shrink-0" />}<span>{errorMessage}</span></div>}
    </section>
  );
};
