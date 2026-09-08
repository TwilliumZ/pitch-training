/**
 * LAN対戦/協力サーバ (ハッカソン用・完全無料・ネット公開なし)
 * 起動: node server.lan.js (http://0.0.0.0:3001)
 * 仕様: メモリ保持・再起動で消える・認証なし・ポーリング方式
 * battle=単音で最終スコア競合 / coop=メロディー限定で協力プレイ
 */
import express from 'express';

const app = express();
app.use(express.json());
// 簡易CORS (LAN内)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const rooms = new Map(); // roomId -> room

function makeRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(id) ? makeRoomId() : id;
}

function publicState(room) {
  return {
    roomId: room.id,
    status: room.status, // lobby | playing | finished
    mode: room.mode, // battle | coop
    difficulty: room.difficulty,
    numQuestions: room.numQuestions,
    players: room.players.map((p) => ({ name: p.name, score: p.score, finished: p.finished })),
    melodyId: room.melodyId || null,
    hasQuestions: room.questions.length > 0,
    updatedAt: Date.now(),
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

// 部屋作成 (mode: battle | coop)
app.post('/api/rooms', (req, res) => {
  const { hostName = 'ホスト', difficulty = 'standard', numQuestions = 5, mode = 'battle', melodyId = null, roomId: customRoomId = null } = req.body || {};
  let id = customRoomId && customRoomId.trim().length === 4 ? customRoomId.toUpperCase() : makeRoomId();
  if (rooms.has(id)) {
    return res.status(400).json({ error: 'その部屋コードは既に使われています' });
  }
  rooms.set(id, {
    id,
    mode,
    difficulty,
    numQuestions: Math.max(1, Math.min(20, numQuestions | 0)),
    status: 'lobby',
    players: [{ name: String(hostName).slice(0, 12) || 'ホスト', score: 0, finished: false }],
    questions: [],
    melodyId,
  });
  res.json({ roomId: id });
});

// 入室
app.post('/api/rooms/:id/join', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: '部屋がありません' });
  if (room.status !== 'lobby') return res.status(400).json({ error: '対戦中です' });
  const name = String((req.body || {}).name || 'ゲスト').slice(0, 12);
  if (!room.players.some((p) => p.name === name)) {
    if (room.players.length >= 8) return res.status(400).json({ error: '満員です(8人)' });
    room.players.push({ name, score: 0, finished: false });
  }
  res.json({ ok: true, state: publicState(room) });
});

// ホストが出題を登録 (battle用)
app.post('/api/rooms/:id/questions', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: '部屋がありません' });
  room.questions = (req.body || {}).questions || [];
  room.numQuestions = room.questions.length || room.numQuestions;
  res.json({ ok: true });
});

// 開始
app.post('/api/rooms/:id/start', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: '部屋がありません' });
  if (room.questions.length === 0) return res.status(400).json({ error: '出題が未登録です' });
  room.status = 'playing';
  room.players.forEach((p) => { p.score = 0; p.finished = false; });
  res.json({ ok: true });
});

// 状態 + 出題取得 (出題はplaying/finishedのみ返す)
app.get('/api/rooms/:id/state', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: '部屋がありません' });
  const state = publicState(room);
  if (room.status !== 'lobby') state.questions = room.questions;
  // 全員finishedならfinished化
  if (room.status === 'playing' && room.players.length > 0 && room.players.every((p) => p.finished)) {
    room.status = 'finished';
    state.status = 'finished';
  }
  res.json(state);
});

// スコア提出
app.post('/api/rooms/:id/finish', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) return res.status(404).json({ error: '部屋がありません' });
  const { name, score } = req.body || {};
  const p = room.players.find((x) => x.name === name);
  if (!p) return res.status(404).json({ error: '参加者がいません' });
  p.score = Number(score) | 0;
  p.finished = true;
  res.json({ ok: true, state: publicState(room) });
});

const PORT = process.env.LAN_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LAN battle/coop server on http://0.0.0.0:${PORT}`);
});
