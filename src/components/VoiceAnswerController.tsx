import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mic, MicOff, RotateCcw, ServerCrash } from 'lucide-react';
import type { NoteInfo } from '../types';
import { AnswerStaff } from './AnswerStaff';
import { encodeMonoWav, noteFromDetectedMidi, recognizePitch } from '../utils/pitchRecognition';

interface VoiceAnswerControllerProps {
  onSelectNote: (note: NoteInfo, via: 'voice_singing', rawText?: string) => void;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'recording' | 'analyzing';
const RECORDING_MS = 1800;

export const VoiceAnswerController: React.FC<VoiceAnswerControllerProps> = ({ onSelectNote, disabled = false }) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [detectedNote, setDetectedNote] = useState<NoteInfo | null>(null);
  const [detectedFrequency, setDetectedFrequency] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const samplesRef = useRef<Float32Array[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const releaseRecorder = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    setMicLevel(0);
  };

  useEffect(() => () => {
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
      setState('idle');
      setErrorMessage('録音が短すぎます。マイクに向かって1秒ほど発声してください。');
      return;
    }
    setState('analyzing');
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const result = await recognizePitch(encodeMonoWav(samples, sampleRate), abort.signal);
      const note = noteFromDetectedMidi(result.midiNumber);
      if (!note) throw new Error(`検出した音（${result.noteName}）は出題範囲外です。中央のド〜高いドで発声してください。`);
      setDetectedNote(note);
      setDetectedFrequency(result.frequencyHz);
      setErrorMessage(null);
      onSelectNote(note, 'voice_singing', `torchaudio: ${result.frequencyHz.toFixed(1)}Hz / 信頼度 ${Math.round(result.confidence * 100)}%`);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setErrorMessage((error as Error).message);
      setState('idle');
    }
  };

  const startRecording = async () => {
    if (disabled || state !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('このブラウザはマイク録音に対応していません。');
      return;
    }
    setErrorMessage(null);
    setDetectedNote(null);
    setDetectedFrequency(null);
    samplesRef.current = [];
    try {
      // 持続する歌声を「背景ノイズ」として除去しないよう音声補正を無効化する。
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
      const context = new AudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
        samplesRef.current.push(chunk);
        const rms = Math.sqrt(chunk.reduce((sum, value) => sum + value * value, 0) / chunk.length);
        setMicLevel(Math.min(1, rms * 10));
      };
      source.connect(processor);
      processor.connect(context.destination);
      streamRef.current = stream;
      contextRef.current = context;
      sourceRef.current = source;
      processorRef.current = processor;
      setState('recording');
      timeoutRef.current = window.setTimeout(() => void finishRecording(), RECORDING_MS);
    } catch {
      releaseRecorder();
      setState('idle');
      setErrorMessage('マイクを開始できません。ブラウザのサイト設定でマイクを許可してください。');
    }
  };

  return (
    <section className="w-full rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3" aria-label="音声回答">
      <div className="text-center"><p className="text-sm font-black text-indigo-900">マイクに向かって指定された高さの音を発声</p><p className="text-xs text-indigo-600 mt-1">「アー」など、一定の声を約2秒伸ばしてください</p></div>
      {detectedNote && <div className="rounded-xl border border-emerald-200 bg-white px-3 pt-2 text-center" role="status"><p className="text-xs font-bold text-emerald-700">認識した音: {detectedNote.nameJa}（{detectedNote.nameEn} / {detectedFrequency?.toFixed(1)}Hz）</p><div className="max-w-xs mx-auto"><AnswerStaff notes={[detectedNote]} labels={['回答']} /></div></div>}
      <button type="button" onClick={() => void startRecording()} disabled={disabled || state !== 'idle'} className={`w-full min-h-16 rounded-2xl font-black flex items-center justify-center gap-3 transition-all ${state === 'recording' ? 'bg-rose-500 text-white' : state === 'analyzing' ? 'bg-indigo-300 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} disabled:cursor-not-allowed`}>
        {state === 'recording' ? <><Mic className="w-6 h-6" /><span>録音中… 声を伸ばしてください</span></> : state === 'analyzing' ? <><LoaderCircle className="w-6 h-6 animate-spin" /><span>torchaudio で音高を解析中…</span></> : <><MicOff className="w-6 h-6" /><span>{errorMessage ? 'もう一度録音する' : 'タップして音声で回答'}</span></>}
      </button>
      {state === 'recording' && <div className="h-2 rounded-full bg-indigo-100 overflow-hidden" aria-label="マイク入力レベル"><div className="h-full bg-rose-500 transition-all duration-75" style={{ width: `${Math.max(3, micLevel * 100)}%` }} /></div>}
      {errorMessage && <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2" role="alert">{errorMessage.includes('サーバー') || errorMessage.includes('解析') ? <ServerCrash className="w-4 h-4 shrink-0" /> : <RotateCcw className="w-4 h-4 shrink-0" />}<span>{errorMessage}</span></div>}
    </section>
  );
};
