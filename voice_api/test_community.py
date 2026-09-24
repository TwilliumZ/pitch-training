import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from .main import app


class CommunityTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.environment = patch.dict(os.environ, {'DATABASE_URL': '', 'POSTGRES_URL': '', 'VERCEL': '', 'LEADERBOARD_DB_PATH': str(Path(self.directory.name) / 'test.db')})
        self.environment.start()
        self.client = TestClient(app)
        self.owner = {'Authorization': 'Bearer ' + 'a' * 64}
        self.other = {'Authorization': 'Bearer ' + 'b' * 64}

    def tearDown(self):
        self.client.close()
        self.environment.stop()
        self.directory.cleanup()

    def payload(self, post=False):
        data = dict(id=str(uuid4()), name='参加者', body='一緒に練習しましょう')
        if post:
            data['title'] = '今夜の音感練習'
        return data

    def create(self):
        data = self.payload(True)
        response = self.client.post('/api/community/posts', json=data, headers=self.owner)
        self.assertEqual(response.status_code, 200, response.text)
        return data

    def test_shared_ownership_and_no_secret_exposure(self):
        data = self.create()
        with TestClient(app) as peer:
            public = peer.get('/api/community/posts', headers=self.other).json()
        self.assertEqual(public[0]['id'], data['id'])
        self.assertFalse(public[0]['mine'])
        self.assertNotIn('owner', public[0])
        self.assertNotIn('deleted', public[0])
        self.assertTrue(self.client.get('/api/community/posts', headers=self.owner).json()[0]['mine'])
        self.assertFalse(self.client.get('/api/community/posts').json()[0]['mine'])

    def test_idempotent_retry_conflict_and_rate_limit(self):
        data = self.create()
        self.assertEqual(self.client.post('/api/community/posts', json=data, headers=self.owner).status_code, 200)
        self.assertEqual(self.client.post('/api/community/posts', json=data, headers=self.other).status_code, 409)
        response = self.client.post('/api/community/posts', json=self.payload(True), headers=self.owner)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers['Retry-After'], '30')
        self.assertEqual(len(self.client.get('/api/community/posts').json()), 1)

    def test_only_owner_can_close_and_delete(self):
        data = self.create()
        path = '/api/community/posts/' + data['id']
        self.assertEqual(self.client.patch(path, json={'closed': True}, headers=self.other).status_code, 403)
        self.assertEqual(self.client.delete(path, headers=self.other).status_code, 403)
        self.assertTrue(self.client.patch(path, json={'closed': True}, headers=self.owner).json()['closed'])
        self.assertFalse(self.client.patch(path, json={'closed': False}, headers=self.owner).json()['closed'])
        self.assertEqual(self.client.delete(path, headers=self.owner).status_code, 200)
        self.assertEqual(self.client.get(path).status_code, 404)
        self.assertEqual(self.client.get('/api/community/posts').json(), [])
        self.assertEqual(self.client.post('/api/community/posts', json=data, headers=self.owner).status_code, 410)
        self.assertEqual(self.client.get('/api/community/rooms/' + data['id'] + '/messages').status_code, 404)

    def test_room_isolation_and_closed_room_conversation(self):
        post = self.create()
        room = '/api/community/rooms/' + post['id'] + '/messages'
        lobby = '/api/community/rooms/lobby/messages'
        self.client.patch('/api/community/posts/' + post['id'], json={'closed': True}, headers=self.owner)
        first = self.payload()
        self.assertEqual(self.client.post(room, json=first, headers=self.owner).status_code, 200)
        self.assertEqual(self.client.post(lobby, json=self.payload(), headers=self.other).status_code, 200)
        self.assertEqual([m['id'] for m in self.client.get(room).json()], [first['id']])
        self.assertNotEqual(self.client.get(lobby).json()[0]['id'], first['id'])
        missing = '/api/community/rooms/' + str(uuid4()) + '/messages'
        self.assertEqual(self.client.post(missing, json=self.payload(), headers=self.owner).status_code, 404)
        self.assertEqual(self.client.get('/api/community/rooms/invalid/messages').status_code, 422)

    def test_message_retry_throttle_and_deletion(self):
        path = '/api/community/rooms/lobby/messages'
        data = self.payload()
        self.assertEqual(self.client.post(path, json=data, headers=self.owner).status_code, 200)
        self.assertEqual(self.client.post(path, json=data, headers=self.owner).status_code, 200)
        self.assertEqual(self.client.post(path, json=self.payload(), headers=self.owner).status_code, 429)
        deletion = '/api/community/messages/' + data['id']
        self.assertEqual(self.client.delete(deletion, headers=self.other).status_code, 403)
        self.assertEqual(self.client.delete(deletion, headers=self.owner).status_code, 200)
        self.assertEqual(self.client.get(path).json(), [])
        self.assertEqual(self.client.post(path, json=data, headers=self.owner).status_code, 410)

    def test_validation_and_authentication(self):
        path = '/api/community/posts'
        self.assertEqual(self.client.post(path, json=self.payload(True)).status_code, 401)
        self.assertEqual(self.client.get(path, headers={'Authorization': 'Bearer forged'}).status_code, 401)
        for key, value in [('name', ' '), ('name', 'a' * 13), ('title', '\t'), ('body', 'a' * 1001), ('body', '\x00'), ('owner', 'forged')]:
            data = self.payload(True)
            data[key] = value
            self.assertEqual(self.client.post(path, json=data, headers=self.owner).status_code, 422)
        data = self.payload()
        data['body'] = 'a' * 501
        self.assertEqual(self.client.post('/api/community/rooms/lobby/messages', json=data, headers=self.owner).status_code, 422)

    def test_text_is_stored_literally(self):
        data = self.payload(True)
        data['body'] = "<script>alert('x')</script> '; DROP TABLE community_posts; --"
        self.assertEqual(self.client.post('/api/community/posts', json=data, headers=self.owner).status_code, 200)
        self.assertEqual(self.client.get('/api/community/posts').json()[0]['body'], data['body'])


if __name__ == '__main__':
    unittest.main()
