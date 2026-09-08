import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Users, Trophy, Volume2, Music, RotateCcw } from 'lucide-react';
import { GameDifficulty, GameQuestion, NoteInfo } from '../types';
import { MELODIES, getMelodyById, melodyToQuestions, barIndexOfNote, noteStartOfBar, flattenMelody } from '../utils/melodiesData';
import { calculateClosenessScore, calculateSpeedBonus, calculateStreakBonus } from '../utils/notesData';
import { playNoteSound, playMelody } from '../utils/audioSynthesizer';
import { ChoicesGrid } from './ChoicesGrid';
import { TimerSpeedBar } from './TimerSpeedBar';
import { BgmLoopPlayer } from './BgmLoopPlayer';

interface CoopModeProps {
  difficulty: GameDifficulty;
  numQuestions: number;
  onExit: () => void;
}

interface ServerPlayer {
  name: string;
  score: number;
  finished: boolean;
}

interface ServerState {
  roomId: string;
  status: 'lobby' | 'playing' | 'finished';
  mode: 'battle' | 'coop';
  difficulty: GameDifficulty;
  numQuestions: number;
  players: ServerPlayer[];
  melodyId: string | null;
  questions?: GameQuestion[];
  hasQuestions: boolean;
  updatedAt: number;
}

function defaultServerUrl(): string {
  const host = window.location.hostname || 'localhost';
  return `http://${host}:3001`;
}

async function api(base: string, path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `通信エラー(${res.status})`);
  return data;
}

const TIME_LIMIT_SEC = 15;

export const CoopMode: React.FC<CoopModeProps> = ({ difficulty, numQuestions, onExit }) => {
  const [serverUrl, setServerUrl] = useState<string>(() => defaultServerUrl());
  const [playerName, setPlayerName] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [roomIdInput, setRoomIdInput] = useState<string>(''); // 入力用（フィルター前）
  const [isHost, setIsHost] = useState<boolean>(false);
  const [joined, setJoined] = useState<boolean>(false);
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMelodyId, setSelectedMelodyId] = useState<string>(MELODIES[0].id);

  // ローカル協力プレイ状態
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [idx, setIdx] = useState<number>(0);
  const [teamScore, setTeamScore] = useState<number>(0);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [playerStreaks, setPlayerStreaks] = useState<Record<string, number>>({});
  const [currentAnswerer, setCurrentAnswerer] = useState<string>('');
  const [remaining, setRemaining] = useState<number>(TIME_LIMIT_SEC);
  const [isPlayingSound, setIsPlayingSound] = useState<boolean>(false);
  const [melodyPlayed, setMelodyPlayed] = useState<boolean>(false);
  const [phase, setPhase] = useState<'lobby-entry' | 'lobby' | 'melody' | 'playing' | 'finished'>('lobby-entry');
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const current = questions[idx] || null;
  const melody = serverState?.melodyId ? getMelodyById(serverState.melodyId) : MELODIES[0];

  const pollState = useCallback(async () => {
    if (!joined || !roomId) return;
    try {
      const s = (await api(serverUrl, `/api/rooms/${roomId}/state`)) as ServerState;
      setServerState(s);
      if (s.status === 'playing' && s.questions && questions.length === 0) {
        setQuestions(s.questions);
        setIdx(0);
        setTeamScore(0);
        setPlayerScores({});
        setPlayerStreaks({});
        s.players.forEach(p => { setPlayerScores(prev => ({ ...prev, [p.name]: 0 })); setPlayerStreaks(prev => ({ ...prev, [p.name]: 0 })); });
        setPhase('melody');
      }
    } catch {
      // ポーリング失敗は無視
    }
  }, [joined, roomId, serverUrl, questions.length]);

  useEffect(() => {
    if (!joined) return;
    pollState();
    const t = window.setInterval(pollState, 2000);
    return () => window.clearInterval(t);
  }, [joined, pollState]);

  // メロディー全体を1回流す
  useEffect(() => {
    if (phase !== 'melody' || melodyPlayed) return;
    setIsPlayingSound(true);
    const frequencies = melody.bars.flat().map(m => {
      const n = MELODIES[0].bars[0][0]; // dummy
      const note = getMelodyById(melody.id).bars.flat().find((_, i) => false); // dummy
      return 440; // dummy
    });
    // 正しく周波数を取得
    const melodyNotes = melody.bars.flat().map(m => {
      const n = MELODIES[0].bars[0][0];
      const note = MELODIES.flatMap(m => m.bars.flat()).find(x => x === m);
      // 正しく:
      return 440 * Math.pow(2, (m - 69) / 12);
    });
    playMelody(melodyNotes, 0.35, 0.05, 'piano');
    const totalDur = melodyNotes.length * 0.4 + 500;
    window.setTimeout(() => {
      setIsPlayingSound(false);
      setMelodyPlayed(true);
      setPhase('playing');
      // 最初の解答者 = 最初のプレイヤー
      if (serverState?.players.length) setCurrentAnswerer(serverState.players[0].name);
    }, totalDur);
  }, [phase, melody, melodyPlayed, serverState?.players]);

  // 出題再生+タイマー
  useEffect(() => {
    if (phase !== 'playing' || !current) return;
    setRemaining(TIME_LIMIT_SEC);
    setIsPlayingSound(true);
    playNoteSound(current.targetNote.frequency, 1.4, 'piano');
    const soundT = window.setTimeout(() => setIsPlayingSound(false), 1400);
    startRef.current = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, TIME_LIMIT_SEC - (Date.now() - startRef.current) / 1000);
      setRemaining(left);
      if (left <= 0 && timerRef.current) {
        window.clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 100);
    return () => {
      window.clearTimeout(soundT);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [phase, current, idx]);

  const handleCreate = async () => {
    setError(null);
    try {
      const name = playerName.trim() || 'ホスト';
      const raw = roomIdInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const customRoomId = raw.length === 4 ? raw : undefined;
      const data = (await api(serverUrl, '/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ hostName: name, difficulty, numQuestions, mode: 'coop', melodyId: selectedMelodyId, roomId: customRoomId }),
      })) as { roomId: string };
      setRoomId(data.roomId);
      setRoomIdInput(data.roomId);
      setIsHost(true);
      setJoined(true);
      setPhase('lobby');
      setPlayerName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成失敗');
    }
  };

  const handleJoin = async () => {
    setError(null);
    try {
      const name = playerName.trim() || 'ゲスト';
      const code = roomIdInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 4) { setError('部屋コードは4文字で入力してください'); return; }
      await api(serverUrl, `/api/rooms/${code}/state`);
      await api(serverUrl, `/api/rooms/${code}/join`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setRoomId(code);
      setRoomIdInput(code);
      setIsHost(false);
      setJoined(true);
      setPhase('lobby');
      setPlayerName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : '入室失敗');
    }
  };

  const handleStart = async () => {
    setError(null);
    try {
      const melodyObj = getMelodyById(selectedMelodyId);
      const qs = melodyToQuestions(melodyObj, difficulty);
      await api(serverUrl, `/api/rooms/${roomId}/questions`, { method: 'POST', body: JSON.stringify({ questions: qs }) });
      await api(serverUrl, `/api/rooms/${roomId}/start`, { method: 'POST' });
      setQuestions(qs);
      setIdx(0);
      setTeamScore(0);
      setPlayerScores({});
      setPlayerStreaks({});
      serverState?.players.forEach(p => { setPlayerScores(prev => ({ ...prev, [p.name]: 0 })); setPlayerStreaks(prev => ({ ...prev, [p.name]: 0 })); });
      await pollState();
    } catch (e) {
      setError(e instanceof Error ? e.message : '開始失敗');
    }
  };

  const handleAnswer = (note: NoteInfo) => {
    if (!current || phase !== 'playing') return;
    if (currentAnswerer && serverState?.players && serverState.players.length > 1) {
      const me = serverState.players.find(p => p.name === playerName);
      if (me && me.name !== currentAnswerer) return; // 自分のターンでない
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
    const elapsed = Math.min(10, Math.max(0.2, (Date.now() - startRef.current) / 1000));
    const closeness = calculateClosenessScore(current.targetNote, note);
    const speed = closeness.semitoneDiff <= 2 ? calculateSpeedBonus(elapsed, 10) : 0;
    let ns = playerStreaks[playerName] || 0;
    let sb = 0;
    if (closeness.semitoneDiff === 0) {
      ns = ns + 1;
      sb = calculateStreakBonus(ns);
    } else if (closeness.semitoneDiff > 1) {
      ns = 0;
    }
    const gained = closeness.score + speed + sb;
    const myNewScore = (playerScores[playerName] || 0) + gained;
    setPlayerScores(prev => ({ ...prev, [playerName]: myNewScore }));
    setPlayerStreaks(prev => ({ ...prev, [playerName]: ns }));
    setTeamScore(prev => prev + gained);

    // 次の小節・次の問題へ
    const nextIdx = idx + 1;
    if (nextIdx < questions.length) {
      setIdx(nextIdx);
      // 解答者交代 (小節境界で交代)
      const currentBar = barIndexOfNote(melody, idx);
      const nextBar = barIndexOfNote(melody, nextIdx);
      if (nextBar !== currentBar && serverState?.players.length) {
        const players = serverState.players.map(p => p.name);
        const currentIdx = players.indexOf(currentAnswerer || playerName);
        const nextIdxPlayer = (currentIdx + 1) % players.length;
        setCurrentAnswerer(players[nextIdxPlayer]);
      }
    } else {
      // 全問終了
      setPhase('finished');
      api(serverUrl, `/api/rooms/${roomId}/finish`, {
        method: 'POST',
        body: JSON.stringify({ name: playerName, score: myNewScore }),
      }).catch(() => undefined);
      pollState();
    }
  };

  const handleTimeout = () => {
    if (!current) return;
    // 不正解扱い
    const nextIdx = idx + 1;
    if (nextIdx < questions.length) {
      setIdx(nextIdx);
      const currentBar = barIndexOfNote(melody, idx);
      const nextBar = barIndexOfNote(melody, nextIdx);
      if (nextBar !== currentBar && serverState?.players.length) {
        const players = serverState.players.map(p => p.name);
        const currentIdx = players.indexOf(currentAnswerer || playerName);
        const nextIdxPlayer = (currentIdx + 1) % players.length;
        setCurrentAnswerer(players[nextIdxPlayer]);
      }
    } else {
      setPhase('finished');
      api(serverUrl, `/api/rooms/${roomId}/finish`, {
        method: 'POST',
        body: JSON.stringify({ name: playerName, score: playerScores[playerName] || 0 }),
      }).catch(() => undefined);
      pollState();
    }
  };

  // 現在の小節全体をリプレイ
  const replayCurrentBar = () => {
    if (!current) return;
    const barIdx = barIndexOfNote(melody, idx);
    const startNoteIdx = noteStartOfBar(melody, barIdx);
    const barNotes = melody.bars[barIdx];
    const frequencies = barNotes.map(m => 440 * Math.pow(2, (m - 69) / 12));
    setIsPlayingSound(true);
    playMelody(frequencies, 0.35, 0.05, 'piano');
    const totalDur = frequencies.length * 0.4 + 500;
    window.setTimeout(() => setIsPlayingSound(false), totalDur);
  };

  const currentBar = current ? barIndexOfNote(melody, idx) : 0;
  const barProgress = current ? (idx - noteStartOfBar(melody, currentBar) + 1) : 0;
  const barTotal = current ? melody.bars[currentBar]?.length || 1 : 1;

  // Feature 3: BGM loop uses the coop melody itself (midi -> frequency)
  const bgmFreqs = flattenMelody(melody).map((m) => 440 * Math.pow(2, (m - 69) / 12));

  const ranking = [...(serverState?.players || [])].map(p => ({
    name: p.name,
    score: playerScores[p.name] || 0,
    finished: p.finished,
  })).sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/95 rounded-3xl p-6 border border-slate-700 space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> もどる
        </button>
        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
          <Music className="w-4 h-4" /> LAN協力 {roomId && <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">部屋:{roomId}</span>}
        </span>
      </div>

      {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">{error}</div>}

      {phase === 'lobby-entry' && (
        <div className="space-y-3">
          <label className="block text-xs text-slate-300">
            サーバURL（ホストはそのまま、参加者はホストのIPに変える）
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono" />
          </label>
          <label className="block text-xs text-slate-300">
            名前
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={12} placeholder="例: たろう" className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-xs text-slate-300">
            曲を選ぶ
            <select value={selectedMelodyId} onChange={(e) => setSelectedMelodyId(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white">
              {MELODIES.map(m => <option key={m.id} value={m.id}>{m.title}（{m.bars.length}小節・{m.bars.flat().length}音）</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-300">
            部屋コード（任意・4文字英数字・空なら自動生成）
            <input value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} maxLength={4} placeholder="例: 1234 または ABCD" className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase" />
            <span className="text-[10px] text-slate-500">英数字のみ・作成時は空で自動生成</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={handleCreate} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">部屋を作る（ホスト）</button>
          </div>
          <div className="flex gap-2">
            <input value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())} maxLength={4} placeholder="部屋コード4文字" className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase" />
            <button type="button" onClick={handleJoin} disabled={roomIdInput.trim().length !== 4} className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white disabled:opacity-40">入室</button>
          </div>
        </div>
      )}

      {phase === 'lobby' && serverState && (
        <div className="space-y-3">
          <div className="text-sm text-slate-200 font-bold">参加者（{serverState.players.length}人）</div>
          <div className="space-y-1.5">
            {serverState.players.map((p) => (
              <div key={p.name} className="flex justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                <span className="text-white font-bold">{p.name}</span>
                <span className="text-slate-400 text-xs">待機中</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-400 text-center mb-2">選曲: {melody.title}（{melody.bars.length}小節・{melody.bars.flat().length}音）</div>
          {isHost ? (
            <button type="button" onClick={handleStart} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> 全員で{melody.bars.flat().length}音に挑戦
            </button>
          ) : (
            <p className="text-xs text-slate-400 text-center">ホストの開始待ちです…</p>
          )}
        </div>
      )}

      {phase === 'melody' && (
        <div className="space-y-3 text-center">
          <div className="text-lg font-bold text-emerald-400 flex items-center justify-center gap-2">
            <Music className="w-6 h-6 animate-spin" /> メロディー再生中…一度よく聴いてください
          </div>
          <div className="text-xs text-slate-400">{melody.title} / {melody.memo}</div>
          <div className="w-full bg-slate-900 rounded-xl h-4 overflow-hidden">
            <div className="bg-emerald-500 h-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {phase === 'playing' && current && serverState && (
        <div className="space-y-4">
          {/* Feature 3: loop the coop melody as BGM (stops automatically on exit) */}
          <BgmLoopPlayer melodyFreqs={bgmFreqs} stepSec={0.4} />
          <div className="flex justify-between text-xs text-slate-300">
            <span>Q{current.questionNumber}/{questions.length}</span>
            <span className="font-mono text-emerald-400 font-black">チーム:{teamScore.toLocaleString()}pt</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <span>🎵 {melody.title}</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded">第{currentBar + 1}小節({barProgress}/{barTotal})</span>
            <span>🎤 解答:<strong className="text-emerald-300">{currentAnswerer || playerName}</strong></span>
          </div>
          <TimerSpeedBar remainingTime={remaining} totalTime={TIME_LIMIT_SEC} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => playNoteSound(current.targetNote.frequency, 1.4, 'piano')}
              className="flex-1 py-4 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <Volume2 className="w-5 h-5" /> {isPlayingSound ? '再生中…' : 'この音を聴く'}
            </button>
            <button
              type="button"
              onClick={replayCurrentBar}
              disabled={isPlayingSound}
              className="flex-1 py-4 rounded-2xl bg-emerald-700/30 border border-emerald-500/40 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Music className="w-5 h-5" /> {isPlayingSound ? '再生中…' : 'この小節を聴く'}
            </button>
          </div>
          <ChoicesGrid choices={current.choices} selectedNote={null} onSelect={handleAnswer} disabled={isPlayingSound || (currentAnswerer && serverState.players.length > 1 && currentAnswerer !== playerName)} />
          <div className="text-xs text-slate-400">小節ごとに解答者が交代します</div>
        </div>
      )}

      {phase === 'finished' && (
        <div className="space-y-3">
          <div className="text-center">
            <Trophy className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-black text-white">チーム合計 {teamScore.toLocaleString()}pt</div>
            <div className="text-xs text-slate-400">全{questions.length}問 完走！</div>
          </div>
          <div className="space-y-1.5">
            {ranking.map((p, i) => (
              <div key={p.name} className={`flex justify-between rounded-xl px-3 py-2 text-sm border ${p.name === playerName ? 'bg-emerald-600/20 border-emerald-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
                <span className="text-white font-bold">{i + 1}位 {p.name}{p.finished ? '' : '…'}</span>
                <span className="font-mono text-emerald-400 font-black">{p.score.toLocaleString()}pt</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setPhase('lobby'); setMelodyPlayed(false); setIdx(0); setTeamScore(0); setQuestions([]); }} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">もう一度遊ぶ</button>
            <button type="button" onClick={onExit} className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white">表紙にもどる</button>
          </div>
        </div>
      )}
    </div>
  );
};