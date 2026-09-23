"""Nickname-based recruitment board and chat with browser-owned posts."""
from datetime import datetime, timezone
import hashlib
import re
import sqlite3
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .database import connect, execute

router = APIRouter(prefix='/api/community')

SCHEMAS = [
    '''CREATE TABLE IF NOT EXISTS community_posts (
        id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL,
        title TEXT NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL,
        closed INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0)''',
    '''CREATE TABLE IF NOT EXISTS community_messages (
        id TEXT PRIMARY KEY, owner TEXT NOT NULL, room TEXT NOT NULL,
        name TEXT NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0)''',
    'CREATE INDEX IF NOT EXISTS community_room ON community_messages (room, created)',
    'CREATE INDEX IF NOT EXISTS community_message_owner ON community_messages (owner, created)',
    'CREATE INDEX IF NOT EXISTS community_post_owner ON community_posts (owner, created)',
]


def identity(authorization: str | None, required=False):
    if not authorization:
        if required:
            raise HTTPException(401, '投稿するにはブラウザの参加情報が必要です。ページを開き直してください。')
        return None
    if not re.fullmatch(r'Bearer [a-f0-9]{64}', authorization):
        raise HTTPException(401, '参加情報が不正です。')
    return hashlib.sha256(authorization[7:].encode()).hexdigest()


def room_key(room: str):
    if room == 'lobby':
        return room
    try:
        return str(UUID(room))
    except ValueError:
        raise HTTPException(422, 'チャットのURLが不正です。') from None


def lock_writer(connection, owner):
    if isinstance(connection, sqlite3.Connection):
        connection.execute('BEGIN IMMEDIATE')
    else:
        execute(connection, 'SELECT pg_advisory_xact_lock(:key)', {'key': int(owner[:15], 16)})


def visible(row, owner):
    result = dict(row)
    result['mine'] = result.pop('owner') == owner
    result.pop('deleted', None)
    if 'closed' in result:
        result['closed'] = bool(result['closed'])
    return result


def get_post(connection, post_id):
    row = execute(connection, 'SELECT * FROM community_posts WHERE id=:id AND deleted=0', {'id': post_id}).fetchone()
    if not row:
        raise HTTPException(404, 'この募集は削除されたか、見つかりません。')
    return row


class MessageInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: UUID
    name: str = Field(min_length=1, max_length=12)
    body: str = Field(min_length=1, max_length=500)

    @field_validator('name', 'body')
    @classmethod
    def clean_text(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 and c not in '\n\t' for c in value):
            raise ValueError('空欄や制御文字は投稿できません。')
        return value


class PostInput(MessageInput):
    title: str = Field(min_length=1, max_length=60)
    body: str = Field(min_length=1, max_length=1000)

    @field_validator('title')
    @classmethod
    def clean_title(cls, value):
        return cls.clean_text(value)


class PostState(BaseModel):
    model_config = ConfigDict(extra='forbid')
    closed: bool


@router.get('/posts')
def list_posts(authorization: str | None = Header(default=None)):
    owner = identity(authorization)
    connection = connect()
    try:
        return [visible(row, owner) for row in execute(connection,
            'SELECT * FROM community_posts WHERE deleted=0 ORDER BY closed ASC, created DESC LIMIT 50')]
    finally:
        connection.close()


@router.get('/posts/{post_id}')
def read_post(post_id: UUID, authorization: str | None = Header(default=None)):
    owner = identity(authorization)
    connection = connect()
    try:
        return visible(get_post(connection, str(post_id)), owner)
    finally:
        connection.close()


def save_item(table, data, owner, seconds):
    connection = connect()
    try:
        with connection:
            lock_writer(connection, owner)
            if table == 'community_messages' and data['room'] != 'lobby':
                get_post(connection, data['room'])
            existing = execute(connection, f'SELECT * FROM {table} WHERE id=:id', data).fetchone()
            if existing:
                if existing['owner'] != owner or any(existing[key] != value for key, value in data.items()):
                    raise HTTPException(409, 'この投稿IDは既に使われています。')
                if existing['deleted']:
                    raise HTTPException(410, 'この投稿は削除済みです。')
                return visible(existing, owner)
            now = datetime.now(timezone.utc)
            last = execute(connection, f'SELECT created FROM {table} WHERE owner=:owner ORDER BY created DESC LIMIT 1', {'owner': owner}).fetchone()
            if last and (now - datetime.fromisoformat(last['created'])).total_seconds() < seconds:
                raise HTTPException(429, f'連続投稿を防ぐため、{seconds}秒ほど間隔をあけてください。', headers={'Retry-After': str(seconds)})
            data = dict(data, owner=owner, created=now.isoformat())
            columns = ', '.join(data)
            bindings = ', '.join(':' + key for key in data)
            execute(connection, f'INSERT INTO {table} ({columns}) VALUES ({bindings})', data)
            row = execute(connection, f'SELECT * FROM {table} WHERE id=:id', data).fetchone()
            return visible(row, owner)
    finally:
        connection.close()


@router.post('/posts')
def create_post(data: PostInput, authorization: str | None = Header(default=None)):
    owner = identity(authorization, required=True)
    return save_item('community_posts', dict(id=str(data.id), name=data.name, title=data.title, body=data.body), owner, 30)


@router.patch('/posts/{post_id}')
def close_post(post_id: UUID, state: PostState, authorization: str | None = Header(default=None)):
    owner = identity(authorization, required=True)
    connection = connect()
    try:
        with connection:
            lock_writer(connection, owner)
            post = get_post(connection, str(post_id))
            if post['owner'] != owner:
                raise HTTPException(403, '自分の募集だけ変更できます。')
            execute(connection, 'UPDATE community_posts SET closed=:closed WHERE id=:id', {'id': str(post_id), 'closed': int(state.closed)})
            return visible(get_post(connection, str(post_id)), owner)
    finally:
        connection.close()


@router.get('/rooms/{room}/messages')
def list_messages(room: str, authorization: str | None = Header(default=None)):
    room = room_key(room)
    owner = identity(authorization)
    connection = connect()
    try:
        if room != 'lobby':
            get_post(connection, room)
        rows = execute(connection, 'SELECT * FROM community_messages WHERE room=:room AND deleted=0 ORDER BY created DESC LIMIT 100', {'room': room}).fetchall()
        return [visible(row, owner) for row in reversed(rows)]
    finally:
        connection.close()


@router.post('/rooms/{room}/messages')
def create_message(room: str, data: MessageInput, authorization: str | None = Header(default=None)):
    owner = identity(authorization, required=True)
    return save_item('community_messages', dict(id=str(data.id), name=data.name, body=data.body, room=room_key(room)), owner, 2)


@router.delete('/{kind}/{item_id}')
def delete_item(kind: str, item_id: UUID, authorization: str | None = Header(default=None)):
    owner = identity(authorization, required=True)
    table = {'posts': 'community_posts', 'messages': 'community_messages'}.get(kind)
    if not table:
        raise HTTPException(404, '投稿が見つかりません。')
    connection = connect()
    try:
        with connection:
            lock_writer(connection, owner)
            row = execute(connection, f'SELECT owner FROM {table} WHERE id=:id', {'id': str(item_id)}).fetchone()
            if not row:
                raise HTTPException(404, '投稿が見つかりません。')
            if row['owner'] != owner:
                raise HTTPException(403, '自分の投稿だけ削除できます。')
            execute(connection, f'UPDATE {table} SET deleted=1 WHERE id=:id', {'id': str(item_id)})
            return {'ok': True}
    finally:
        connection.close()
