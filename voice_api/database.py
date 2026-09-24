"""Postgres for hosted deployments, SQLite for local development."""
import os
from pathlib import Path
import re
import sqlite3

from fastapi import HTTPException

SCHEMA = '''CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, difficulty TEXT NOT NULL,
    "answerMode" TEXT NOT NULL, "questionCount" INTEGER NOT NULL,
    "allowDuplicates" INTEGER NOT NULL, practice INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL, "perfectCount" INTEGER NOT NULL,
    "maxStreak" INTEGER NOT NULL, "averageTimeSec" DOUBLE PRECISION NOT NULL, date TEXT NOT NULL
)'''
INDEX = '''CREATE INDEX IF NOT EXISTS ranking_category ON entries
    (difficulty, "answerMode", "questionCount", "allowDuplicates", practice, "totalScore" DESC)'''


def execute(connection, query, params=None):
    if not isinstance(connection, sqlite3.Connection):
        query = re.sub(r':([a-zA-Z][a-zA-Z0-9_]*)', r'%(\1)s', query)
    return connection.execute(query, params or {})


def connect():
    url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')
    if url:
        import psycopg
        from psycopg.rows import dict_row
        try:
            connection = psycopg.connect(url, row_factory=dict_row, connect_timeout=10)
            # Concurrent cold starts must not race when initializing the schema.
            connection.execute('SELECT pg_advisory_xact_lock(726489102)')
            connection.execute(SCHEMA)
            connection.execute(INDEX)
            from .community import SCHEMAS
            for schema in SCHEMAS:
                connection.execute(schema)
            connection.commit()
            return connection
        except psycopg.Error:
            if 'connection' in locals():
                connection.close()
            raise HTTPException(status_code=503, detail='ランキングに接続できません。しばらくして再試行してください。') from None
    if os.environ.get('VERCEL'):
        raise HTTPException(status_code=503, detail='共有ランキングのデータベース設定が必要です。')
    path = Path(os.environ.get('LEADERBOARD_DB_PATH', 'data/leaderboard.sqlite3'))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute(SCHEMA)
    connection.execute(INDEX)
    from .community import SCHEMAS
    for schema in SCHEMAS:
        connection.execute(schema)
    connection.commit()
    return connection
