import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from .main import app


class LeaderboardTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.environment = patch.dict(os.environ, {"DATABASE_URL": "", "POSTGRES_URL": "", "VERCEL": "", "LEADERBOARD_DB_PATH": str(Path(self.directory.name) / "ranking.db")})
        self.environment.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.environment.stop()
        self.directory.cleanup()

    def submission(self, **changes):
        return dict(id=str(uuid4()), name="プレイヤー", difficulty="standard", answerMode="choice",
                    allowDuplicates=False, practice=False,
                    answers=[dict(targetMidi=n, chosenMidi=n, timeTakenSec=2) for n in [60, 62, 64, 65, 67]], **changes)

    def test_empty_then_shared_with_another_client(self):
        self.assertEqual(self.client.get('/api/leaderboard').json(), [])
        response = self.client.post('/api/leaderboard', json=self.submission())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['totalScore'], 9950)
        with TestClient(app) as other:
            entries = other.get('/api/leaderboard').json()
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['perfectCount'], 5)
        self.assertEqual(entries[0]['maxStreak'], 5)

    def test_retry_does_not_duplicate_or_overwrite(self):
        payload = self.submission()
        first = self.client.post('/api/leaderboard', json=payload).json()
        self.assertEqual(self.client.post('/api/leaderboard', json=payload).json(), first)
        payload['name'] = '別の名前'
        self.assertEqual(self.client.post('/api/leaderboard', json=payload).status_code, 409)
        self.assertEqual(len(self.client.get('/api/leaderboard').json()), 1)

    def test_categories_are_separate(self):
        for field, value in [('difficulty', 'advanced'), ('answerMode', 'voice'), ('allowDuplicates', True), ('practice', True)]:
            payload = self.submission()
            payload[field] = value
            self.assertEqual(self.client.post('/api/leaderboard', json=payload).status_code, 200)
            self.assertEqual(len(self.client.get('/api/leaderboard', params={field: str(value).lower()}).json()), 1)
        payload = self.submission()
        payload['answers'] = payload['answers'][:3]
        self.client.post('/api/leaderboard', json=payload)
        self.assertEqual(len(self.client.get('/api/leaderboard', params={'questionCount': 3}).json()), 1)
        self.assertEqual(self.client.get('/api/leaderboard').json(), [])

    def test_server_recomputes_and_orders_scores(self):
        slow = self.submission()
        for answer in slow['answers']:
            answer['timeTakenSec'] = 8
        self.client.post('/api/leaderboard', json=slow)
        fast = self.submission()
        self.client.post('/api/leaderboard', json=fast)
        entries = self.client.get('/api/leaderboard').json()
        self.assertEqual([e['id'] for e in entries], [fast['id'], slow['id']])
        forged = self.submission()
        forged['totalScore'] = 999999
        self.assertEqual(self.client.post('/api/leaderboard', json=forged).status_code, 422)

    def test_timeout_resets_streak_and_near_miss_preserves_it(self):
        payload = self.submission()
        payload['answers'][1]['chosenMidi'] = 63
        payload['answers'][3]['chosenMidi'] = None
        result = self.client.post('/api/leaderboard', json=payload).json()
        self.assertEqual(result['perfectCount'], 3)
        self.assertEqual(result['maxStreak'], 2)
        self.assertEqual(result['totalScore'], 5500)

    def test_invalid_payloads_rejected(self):
        for key, value in [('name', ' '), ('name', 'a' * 13), ('answers', []), ('difficulty', 'unknown')]:
            payload = self.submission()
            payload[key] = value
            self.assertEqual(self.client.post('/api/leaderboard', json=payload).status_code, 422)
        payload = self.submission()
        payload['answers'][0]['targetMidi'] = 61
        self.assertEqual(self.client.post('/api/leaderboard', json=payload).status_code, 422)
        payload['answers'][0]['targetMidi'] = 62
        self.assertEqual(self.client.post('/api/leaderboard', json=payload).status_code, 422)

    def test_database_survives_reopening(self):
        self.client.post('/api/leaderboard', json=self.submission())
        self.client.close()
        self.client = TestClient(app)
        self.assertEqual(len(self.client.get('/api/leaderboard').json()), 1)

    def test_vercel_requires_persistent_database(self):
        with patch.dict(os.environ, {"VERCEL": "1"}):
            response = self.client.get('/api/leaderboard')
        self.assertEqual(response.status_code, 503)
        self.assertIn('データベース設定', response.json()['detail'])

    def test_postgres_connection_errors_do_not_expose_credentials(self):
        import psycopg
        with patch.dict(os.environ, {"DATABASE_URL": "postgresql://private-credential"}), patch(
            'psycopg.connect', side_effect=psycopg.OperationalError('private-credential')
        ):
            response = self.client.get('/api/leaderboard')
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('private-credential', response.text)

    def test_public_cannot_delete_records(self):
        self.client.post('/api/leaderboard', json=self.submission())
        self.assertEqual(self.client.delete('/api/leaderboard').status_code, 405)
        self.assertEqual(len(self.client.get('/api/leaderboard').json()), 1)


if __name__ == '__main__':
    unittest.main()
