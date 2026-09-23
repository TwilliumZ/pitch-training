import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Users, Send, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { ChatMessage, CommunityPost, communityError, communityRequest, getNickname, initialCommunityRoom, saveNickname } from '../utils/community';

const inputStyle = 'w-full rounded-xl border border-moss-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-moss-400';
const buttonStyle = 'rounded-xl px-4 py-2 text-sm font-bold bg-moss-500 text-white hover:bg-moss-600 disabled:opacity-50';
const dateLabel = (date: string) => new Date(date).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function CommunitySpace({ onBack }: { onBack: () => void }) {
  const [room, setRoom] = useState(initialCommunityRoom);
  const [tab, setTab] = useState<'board' | 'chat'>(() => initialCommunityRoom() === 'lobby' ? 'board' : 'chat');
  const [name, setName] = useState(getNickname);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPost, setCurrentPost] = useState<CommunityPost | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [composingPost, setComposingPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const pending = useRef<{ key: string; id: string } | null>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('community', '1');
    if (tab === 'chat' && room !== 'lobby') url.searchParams.set('room', room);
    else url.searchParams.delete('room');
    window.history.replaceState(null, '', url);
  }, [tab, room]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    let busy = false;
    setLoading(true);
    setLoadError('');
    const load = async () => {
      if (busy || !active) return;
      if (document.hidden) return;
      busy = true;
      try {
        if (tab === 'board') {
          const data = await communityRequest<CommunityPost[]>('/posts', { signal: controller.signal });
          if (active) setPosts(data);
        } else {
          const [chat, post] = await Promise.all([
            communityRequest<ChatMessage[]>(`/rooms/${room}/messages`, { signal: controller.signal }),
            room === 'lobby' ? Promise.resolve(null) : communityRequest<CommunityPost>(`/posts/${room}`, { signal: controller.signal }),
          ]);
          if (active) { setMessages(chat); setCurrentPost(post); }
        }
        if (active) setLoadError('');
      } catch (error) {
        if (active) setLoadError(communityError(error));
      } finally {
        busy = false;
        if (active) {
          setLoading(false);
          timer = setTimeout(load, tab === 'chat' ? 8000 : 20000);
        }
      }
    };
    const onVisible = () => { clearTimeout(timer); if (!document.hidden) void load(); };
    void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; controller.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [tab, room, refresh]);

  useEffect(() => {
    if (stickToBottom.current && messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
  }, [messages]);

  const chooseRoom = (id: string, post: CommunityPost | null = null) => {
    if (sending) return;
    setRoom(id); setTab('chat'); setMessages([]); setCurrentPost(post);
    setSendError(''); setNotice(''); setMessage(''); pending.current = null;
    stickToBottom.current = true;
  };
  const chooseBoard = () => { if (!sending) { setTab('board'); setSendError(''); setNotice(''); } };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const nickname = name.trim();
    if (!nickname) { setSendError('ニックネームを入力してください。'); return; }
    const isPost = tab === 'board';
    const content = isPost ? { name: nickname, title: title.trim(), body: body.trim() } : { name: nickname, body: message.trim() };
    if (!content.body || (isPost && !title.trim())) { setSendError('投稿内容を入力してください。'); return; }
    const path = isPost ? '/posts' : `/rooms/${room}/messages`;
    const key = JSON.stringify({ path, content });
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    setSending(true); setSendError(''); setNotice('');
    try {
      await communityRequest(path, { method: 'POST', body: JSON.stringify({ ...content, id: pending.current.id }) });
      saveNickname(nickname);
      pending.current = null;
      if (isPost) { setTitle(''); setBody(''); setComposingPost(false); setNotice('募集を公開しました。'); }
      else { setMessage(''); stickToBottom.current = true; setNotice('送信しました。'); }
      setRefresh((value) => value + 1);
    } catch (error) { setSendError(communityError(error)); }
    finally { setSending(false); }
  };

  const changePost = async (post: CommunityPost) => {
    setMutating(true); setSendError('');
    try {
      await communityRequest(`/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ closed: !post.closed }) });
      setRefresh((value) => value + 1);
    } catch (error) { setSendError(communityError(error)); }
    finally { setMutating(false); }
  };
  const remove = async (kind: 'posts' | 'messages', id: string) => {
    if (!window.confirm(kind === 'posts' ? 'この募集を削除しますか？募集のチャットも表示されなくなります。' : 'このメッセージを削除しますか？')) return;
    setMutating(true); setSendError('');
    try {
      await communityRequest(`/${kind}/${id}`, { method: 'DELETE' });
      setRefresh((value) => value + 1);
    } catch (error) { setSendError(communityError(error)); }
    finally { setMutating(false); }
  };
  const copyLink = async (post: CommunityPost) => {
    const url = new URL(window.location.href); url.searchParams.set('community', '1'); url.searchParams.set('room', post.id);
    try { await navigator.clipboard.writeText(url.toString()); setNotice('募集のURLをコピーしました。'); }
    catch { setNotice(`この募集のURL: ${url.toString()}`); }
  };

  return (
    <section className="w-full max-w-3xl space-y-4" aria-labelledby="community-title">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-moss-700"><ArrowLeft className="w-4 h-4" />ゲームに戻る</button>
      <div className="rounded-3xl bg-white border border-moss-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div><h2 id="community-title" className="text-2xl font-black text-slate-800">仲間のひろば</h2><p className="text-sm text-slate-500 mt-1">一緒に音感を練習する仲間を見つけて、結果やコツを話そう。</p></div>
        <div className="flex gap-2" role="group" aria-label="ひろばの切り替え">
          <button type="button" disabled={sending} aria-pressed={tab === 'board'} onClick={chooseBoard} className={`flex-1 rounded-xl p-3 text-sm font-bold flex items-center justify-center gap-2 ${tab === 'board' ? 'bg-moss-500 text-white' : 'bg-moss-50 text-moss-700'}`}><Users className="w-4 h-4" />募集掲示板</button>
          <button type="button" disabled={sending} aria-pressed={tab === 'chat' && room === 'lobby'} onClick={() => chooseRoom('lobby')} className={`flex-1 rounded-xl p-3 text-sm font-bold flex items-center justify-center gap-2 ${tab === 'chat' && room === 'lobby' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}><MessageCircle className="w-4 h-4" />みんなのチャット</button>
        </div>
        <label className="block text-xs font-bold text-slate-600">ニックネーム（12文字まで）<input value={name} onChange={(event) => setName(event.target.value)} maxLength={12} disabled={sending} autoComplete="nickname" className={`${inputStyle} mt-1`} placeholder="例：音感マスター" /></label>
        <p className="text-xs text-slate-500">投稿はこのサイトの参加者に公開されます。本名・連絡先などの個人情報は書かないでください。自分の投稿の操作は、投稿したブラウザで行えます。</p>
        {notice && <p role="status" className="text-sm text-moss-700 break-words">{notice}</p>}
        {sendError && <p role="alert" className="text-sm text-red-600">{sendError}</p>}
        {loadError && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{loadError}<button type="button" onClick={() => setRefresh((value) => value + 1)} className="ml-2 underline">再試行</button></div>}
        {tab === 'board' ? <>
          <div className="flex items-center justify-between gap-2"><h3 className="font-bold">参加者募集 <span className="text-xs font-normal text-slate-500">最新50件</span></h3><button type="button" className={buttonStyle} onClick={() => setComposingPost(!composingPost)}>{composingPost ? 'フォームを閉じる' : '募集を書く'}</button></div>
          {composingPost && <form onSubmit={send} className="rounded-2xl bg-moss-50 p-4 space-y-3">
            <label className="block text-sm font-bold">タイトル<input value={title} disabled={sending} onChange={(e) => setTitle(e.target.value)} maxLength={60} required placeholder="例：今夜20時から5問ずつ練習しませんか？" className={`${inputStyle} mt-1`} /></label>
            <label className="block text-sm font-bold">募集内容<textarea value={body} disabled={sending} onChange={(e) => setBody(e.target.value)} maxLength={1000} required rows={4} placeholder="集まる日時、練習したいモード、参加してほしい人など" className={`${inputStyle} mt-1`} /></label>
            <div className="flex justify-between items-center"><span className="text-xs text-slate-500">{body.length}/1000文字</span><button disabled={sending} type="submit" className={buttonStyle}>{sending ? '公開中…' : '募集を公開'}</button></div>
          </form>}
          {loading && !posts.length && <p role="status" className="text-sm text-slate-500">読み込み中…</p>}
          {!loading && !loadError && !posts.length && <p className="py-8 text-center text-sm text-slate-500">まだ募集はありません。最初の仲間を募集してみましょう。</p>}
          <div className="space-y-3">{posts.map((post) => <article key={post.id} className="rounded-2xl border border-moss-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2"><h4 className="font-bold break-words min-w-0">{post.title}</h4><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${post.closed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{post.closed ? '募集終了' : '募集中'}</span></div>
            <p className="text-xs text-slate-500">{post.name} ・ {dateLabel(post.created)}{post.mine && ' ・ 自分の募集'}</p><p className="text-sm whitespace-pre-wrap break-words">{post.body}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs"><button type="button" onClick={() => chooseRoom(post.id, post)} className="font-bold text-indigo-700 underline">この募集でチャット</button><button type="button" onClick={() => void copyLink(post)} className="text-moss-700 flex items-center gap-1"><Copy className="w-3 h-3" />URLを共有</button>{post.mine && <><button type="button" disabled={mutating} onClick={() => void changePost(post)} className="text-slate-600 underline">{post.closed ? '募集を再開' : '募集を締め切る'}</button><button type="button" disabled={mutating} onClick={() => void remove('posts', post.id)} className="text-red-600">削除</button></>}</div>
          </article>)}</div>
        </> : <>
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold break-words">{room === 'lobby' ? 'みんなのチャット' : currentPost?.title || '募集のチャット'}</h3><p className="text-xs text-slate-500 mt-1">{currentPost?.closed ? '募集は終了しています。会話は続けられます。' : '最新100件を表示。約8秒ごとに新しい会話を取得します。'}</p></div><button type="button" aria-label="チャットを更新" onClick={() => setRefresh((value) => value + 1)} className="p-2 text-moss-700"><RefreshCw className="w-4 h-4" /></button></div>
          {room !== 'lobby' && <button type="button" onClick={chooseBoard} className="text-xs text-moss-700 underline">募集掲示板に戻る</button>}
          <div ref={messageList} onScroll={() => { const list = messageList.current; if (list) stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80; }} className="h-72 sm:h-96 overflow-y-auto rounded-2xl bg-slate-50 p-3 space-y-3" aria-label="チャットの会話">
            {loading && !messages.length && <p className="text-sm text-slate-500">読み込み中…</p>}
            {!loading && !loadError && !messages.length && <p className="text-sm text-slate-500 text-center py-8">まだ会話はありません。気軽に挨拶してみましょう。</p>}
            {messages.map((item) => <article key={item.id} className={`max-w-[90%] rounded-2xl p-3 ${item.mine ? 'ml-auto bg-moss-100' : 'mr-auto bg-white border border-slate-200'}`}><div className="flex justify-between gap-2 text-xs text-slate-500"><span className="font-bold">{item.name}{item.mine ? '（自分）' : ''}</span><time dateTime={item.created}>{dateLabel(item.created)}</time></div><p className="mt-1 text-sm whitespace-pre-wrap break-words">{item.body}</p>{item.mine && <button type="button" disabled={mutating} aria-label="このメッセージを削除" onClick={() => void remove('messages', item.id)} className="mt-2 text-xs text-slate-500 flex items-center gap-1"><Trash2 className="w-3 h-3" />削除</button>}</article>)}
          </div>
          <form onSubmit={send} className="space-y-2"><label className="block text-xs font-bold text-slate-600">メッセージ<textarea className={`${inputStyle} mt-1`} rows={3} maxLength={500} value={message} disabled={sending} onChange={(e) => setMessage(e.target.value)} required placeholder="メッセージを入力（500文字まで）" /></label><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{message.length}/500文字</span><button type="submit" disabled={sending || Boolean(loadError) || loading} className={`${buttonStyle} flex items-center gap-2`}><Send className="w-4 h-4" />{sending ? '送信中…' : '送信'}</button></div></form>
        </>}
      </div>
    </section>
  );
}
