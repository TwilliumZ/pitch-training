import unittest

from fastapi.testclient import TestClient
from .web import app


class WebTests(unittest.TestCase):
    def test_game_and_api_share_one_origin(self):
        with TestClient(app) as client:
            page = client.get('/')
            self.assertEqual(page.status_code, 200)
            self.assertIn('text/html', page.headers['content-type'])
            self.assertIn('id="root"', page.text)
            self.assertEqual(client.get('/health').json(), {'ok': True})
            self.assertEqual(client.post('/api/pitch').status_code, 422)

    def test_private_files_are_not_public(self):
        with TestClient(app) as client:
            for path in ['/.env', '/voice_api/main.py', '/data/leaderboard.sqlite3', '/package.json']:
                self.assertEqual(client.get(path).status_code, 404)
