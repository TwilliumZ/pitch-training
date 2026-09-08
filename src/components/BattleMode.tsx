import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Users, Trophy, Volume2 } from 'lucide-react';
import { GameDifficulty, GameQuestion, NoteInfo } from '../types';
import { generateGameQuestions, calculateClosenessScore, calculateSpeedBonus, calculateStreakBonus } from '../utils/notesData';
import { playNoteSound } from '../utils/audioSynthesizer';
import { ChoicesGrid } from './ChoicesGrid';
import { TimerSpeedBar } from './TimerSpeedBar';
import { BgmLoopPlayer } from './BgmLoopPlayer';
import { AuditionKeyboard } from './AuditionKeyboard';
import { AnswerStaff } from './AnswerStaff';
import { AnswerReviewPlayer } from './AnswerReviewPlayer';

interface BattleModeProps {
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
  players: ServerPlayer[];
  questions?: GameQuestion[];
  numQuestions: number;
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

export const BattleMode: React.FC<BattleModeProps> = ({ difficulty, numQuestions, onExit }) => {
  const [serverUrl, setServerUrl] = useState<string>(() => defaultServerUrl());
  const [playerName, setPlayerName] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [joined, setJoined] = useState<boolean>(false);
  const [serverState, setServerState] = useState<ServerState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ローカル対戦プレイ
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [idx, setIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(10);
  const [isPlayingSound, setIsPlayingSound] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  // 回答履歴（五線譜表示と比較再生用。採点処理には触らない）
  const [answers, setAnswers] = useState<{ note: NoteInfo; isExact: boolean; qNumber: number }[]>([]);
  // サーバー状態の前回値（新規ラウンド開始の検出用）
  const prevStatusRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const current = questions[idx] || null;
  const phase = !joined ? 'lobby-entry' : serverState?.status === 'playing' || serverState?.status === 'finished' ? (submitted ? 'done' : 'playing') : 'lobby';

  const pollState = useCallback(async () => {
    if (!joined || !roomId) return;
    try {
      const s = (await api(serverUrl, `/api/rooms/${roomId}/state`)) as ServerState;
      setServerState(s);
      // 新規ラウンド検出: playing に入った瞬間は出題を同期し直す
      // （ホスト再開時にゲスト側の進行がずれないようにする）
      const prev = prevStatusRef.current;
      prevStatusRef.current = s.status;
      const newRound = s.status === 'playing' && prev !== 'playing';
      if ((s.status === 'playing' || s.status === 'finished') && s.questions && (questions.length === 0 || newRound)) {
        setQuestions(s.questions);
        setIdx(0);
        setScore(0);
        setStreak(0);
        setSubmitted(false);
        setAnswers([]);
      }
    } catch {
      // ポーリング失敗は無視
    }
  }, [joined, roomId, serverUrl, questions.length]);

  useEffect(() => {
    if (!joined) return;
    pollState();
    // 出題中は同期をこまめに（1秒）、待機中は負荷軽減（2秒）
    const t = window.setInterval(pollState, phase === 'playing' ? 1000 : 2000);
    return () => window.clearInterval(t);
  }, [joined, pollState, phase]);

  // 出題再生+タイマー
  useEffect(() => {
    if (phase !== 'playing' || !current) return;
    setRemaining(10);
    setIsPlayingSound(true);
    playNoteSound(current.targetNote.frequency, 1.4, 'piano');
    const soundT = window.setTimeout(() => setIsPlayingSound(false), 1400);
    startRef.current = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, 10 - (Date.now() - startRef.current) / 1000);
      setRemaining(left);
      if (left <= 0 && timerRef.current) window.clearInterval(timerRef.current);
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
      const customRoomId = roomId.trim().length === 4 ? roomId.trim().toUpperCase() : undefined;
      const data = (await api(serverUrl, '/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ hostName: name, difficulty, numQuestions, mode: 'battle', roomId: customRoomId }),
      })) as { roomId: string };
      setRoomId(data.roomId);
      setIsHost(true);
      setJoined(true);
      setPlayerName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成失敗');
    }
  };

  const handleJoin = async () => {
    setError(null);
    try {
      const name = playerName.trim() || 'ゲスト';
      await api(serverUrl, `/api/rooms/${roomId.toUpperCase()}/state`);
      await api(serverUrl, `/api/rooms/${roomId.toUpperCase()}/join`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setRoomId(roomId.toUpperCase());
      setIsHost(false);
      setJoined(true);
      setPlayerName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : '入室失敗');
    }
  };

  const handleStart = async () => {
    setError(null);
    try {
      const qs = generateGameQuestions(difficulty, numQuestions, false);
      await api(serverUrl, `/api/rooms/${roomId}/questions`, { method: 'POST', body: JSON.stringify({ questions: qs }) });
      await api(serverUrl, `/api/rooms/${roomId}/start`, { method: 'POST' });
      setQuestions(qs);
      setIdx(0);
      setScore(0);
      setStreak(0);
      setSubmitted(false);
      setAnswers([]);
      await pollState();
    } catch (e) {
      setError(e instanceof Error ? e.message : '開始失敗');
    }
  };

  const handleAnswer = (note: NoteInfo) => {
    if (!current || phase !== 'playing') return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    const elapsed = Math.min(10, Math.max(0.2, (Date.now() - startRef.current) / 1000));
    const closeness = calculateClosenessScore(current.targetNote, note);
    const speed = closeness.semitoneDiff <= 2 ? calculateSpeedBonus(elapsed, 10) : 0;
    let ns = streak;
    let sb = 0;
    if (closeness.semitoneDiff === 0) {
      ns = streak + 1;
      sb = calculateStreakBonus(ns);
    } else if (closeness.semitoneDiff > 1) {
      ns = 0;
    }
    const gained = closeness.score + speed + sb;
    const total = score + gained;
    setScore(total);
    setStreak(ns);
    // 回答履歴に記録（五線譜表示と比較再生用）
    setAnswers((prev) => [...prev, { note, isExact: closeness.semitoneDiff === 0, qNumber: current.questionNumber }]);
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
    } else {
      setSubmitted(true);
      api(serverUrl, `/api/rooms/${roomId}/finish`, {
        method: 'POST',
        body: JSON.stringify({ name: playerName, score: total }),
      }).catch(() => undefined);
      pollState();
    }
  };

  const ranking = [...(serverState?.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/95 rounded-3xl p-6 border border-slate-700 space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> もどる
        </button>
        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
          <Users className="w-4 h-4" /> LAN対戦 {roomId && <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">部屋:{roomId}</span>}
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
            部屋コード（任意・4文字英数字・空なら自動生成）
            <input value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={4} placeholder="例: 1234 または ABCD" className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={handleCreate} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold">部屋を作る（ホスト）</button>
          </div>
          <div className="flex gap-2">
            <input value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} maxLength={4} placeholder="部屋コード4文字" className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase" />
            <button type="button" onClick={handleJoin} disabled={roomId.trim().length !== 4} className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white disabled:opacity-40">入室</button>
          </div>
        </div>
      )}

      {phase === 'lobby' && (
        <div className="space-y-3">
          <div className="text-sm text-slate-200 font-bold">参加者（{serverState?.players.length || 1}人）</div>
          <div className="space-y-1.5">
            {(serverState?.players || [{ name: playerName, score: 0, finished: false }]).map((p) => (
              <div key={p.name} className="flex justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                <span className="text-white font-bold">{p.name}</span>
                <span className="text-slate-400 text-xs">待機中</span>
              </div>
            ))}
          </div>
          {isHost ? (
            <button type="button" onClick={handleStart} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> 全員同じ{numQuestions}問で開始
            </button>
          ) : (
            <p className="text-xs text-slate-400 text-center">ホストの開始待ちです…（2秒ごとに更新）</p>
          )}
        </div>
      )}

      {phase === 'playing' && current && (
        <div className="space-y-4">
          {/* Feature 3: BGM loop while playing (stops automatically on exit) */}
          <BgmLoopPlayer />
          <div className="flex justify-between text-xs text-slate-300">
            <span>Q{current.questionNumber}/{questions.length}</span>
            <span className="font-mono text-amber-400 font-black">{score.toLocaleString()}pt</span>
          </div>
          {/* 同期表示: 他メンバーの確定状況（1秒ごとに更新） */}
          {serverState && serverState.players.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]" role="status">
              <span className="text-slate-400 font-bold">同期中</span>
              {serverState.players.map((p) => (
                <span
                  key={p.name}
                  className={`px-2 py-0.5 rounded-full border font-bold ${
                    p.finished
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {p.name}: {p.finished ? `${p.score.toLocaleString()}pt確定` : '対戦中'}
                </span>
              ))}
            </div>
          )}
          <TimerSpeedBar remainingTime={remaining} totalTime={10} />
          <button
            type="button"
            onClick={() => playNoteSound(current.targetNote.frequency, 1.4, 'piano')}
            className="w-full py-4 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Volume2 className="w-5 h-5" /> {isPlayingSound ? '再生中…' : 'もう一度聴く'}
          </button>
          <ChoicesGrid choices={current.choices} selectedNote={null} onSelect={handleAnswer} disabled={isPlayingSound} />
          {/* 音確認鍵盤（試聴のみ） */}
          <AuditionKeyboard disabled={isPlayingSound} />
          {/* これまでの回答の五線譜（継続表示） */}
          {answers.length > 0 && (
            <div className="bg-white rounded-2xl p-3 border border-moss-200 space-y-2">
              <p className="text-xs font-bold text-slate-600">これまでの回答の五線譜</p>
              <AnswerStaff
                notes={answers.map((a) => a.note)}
                correctFlags={answers.map((a) => a.isExact)}
                labels={answers.map((a) => `Q${a.qNumber}`)}
              />
            </div>
          )}
          <div className="text-xs text-slate-400">他メンバーの途中経過は終了後に表示されます</div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-3">
          <div className="text-center">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
            <div className="text-2xl font-black text-white">{score.toLocaleString()}pt</div>
            <div className="text-xs text-slate-400">あなたの確定スコア</div>
          </div>
          {/* 回答と正解の聞き比べ */}
          {answers.length > 0 && (
            <AnswerReviewPlayer
              notes={answers.map((a) => a.note)}
              correctFlags={answers.map((a) => a.isExact)}
            />
          )}
          {questions.length > 0 && (
            <AnswerReviewPlayer
              notes={questions.map((q) => q.targetNote)}
              title="正解の楽譜"
              playLabel="正解を聴き直す"
            />
          )}
          <div className="space-y-1.5">
            {ranking.map((p, i) => (
              <div key={p.name} className={`flex justify-between rounded-xl px-3 py-2 text-sm border ${p.name === playerName ? 'bg-indigo-600/20 border-indigo-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
                <span className="text-white font-bold">{i + 1}位 {p.name}{p.finished ? '' : '…'}</span>
                <span className="font-mono text-amber-400 font-black">{p.score.toLocaleString()}pt</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={onExit} className="w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-white">表紙にもどる</button>
        </div>
      )}
    </div>
  );
};
