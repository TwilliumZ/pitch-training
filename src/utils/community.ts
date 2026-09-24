export interface CommunityPost {
  id: string;
  name: string;
  title: string;
  body: string;
  created: string;
  closed: boolean;
  mine: boolean;
}
export interface ChatMessage {
  id: string;
  name: string;
  body: string;
  created: string;
  room: string;
  mine: boolean;
}

const TOKEN_KEY = 'pitch-community-token';
const NAME_KEY = 'pitch-community-name';
let memoryToken: string | undefined;

export function getCommunityToken(): string {
  if (memoryToken) return memoryToken;
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored && /^[a-f0-9]{64}$/.test(stored)) return memoryToken = stored;
  } catch { /* Session-only participation still works without localStorage. */ }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  memoryToken = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem(TOKEN_KEY, memoryToken); } catch { /* Keep the token in memory. */ }
  return memoryToken;
}

export function getNickname(): string {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}
export function saveNickname(name: string): void {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* Optional preference. */ }
}

export async function communityRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(20000);
  const response = await fetch(`/api/community${path}`, {
    ...options,
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getCommunityToken()}`, ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : '投稿を処理できませんでした。入力内容を確認して再試行してください。');
  if (data === null) throw new Error('サーバーから応答がありません。再試行してください。');
  return data as T;
}

export function communityError(error: unknown): string {
  return error instanceof Error && !['TypeError', 'TimeoutError', 'AbortError'].includes(error.name)
    ? error.message : '接続できませんでした。通信を確認して再試行してください。入力内容は残っています。';
}

export function initialCommunityRoom(): string {
  const room = new URLSearchParams(window.location.search).get('room');
  return room && /^[a-f0-9-]{36}$/i.test(room) ? room : 'lobby';
}
