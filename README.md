<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 音当てピッチマスター

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fe411041-3219-4c50-98cf-6195daff3cfd

## Run Locally

**Prerequisites:** Node.js 18+、Python 3.10+


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 音声回答モード

設定画面の「回答方法」で「音声回答」を選択すると、指定された音を参加者が発声し、torchaudio が音高を認識して正誤を判定します。

1. Python 仮想環境を作成して依存関係を導入します。
   `python3 -m venv .venv && .venv/bin/pip install -r requirements-voice.txt`
2. 音声解析 API を起動します。
   `.venv/bin/uvicorn voice_api.main:app --host 0.0.0.0 --port 8000`
3. 別のターミナルでフロントエンドを起動します。
   `npm run dev`

マイク利用には `localhost` または HTTPS が必要です。音声解析 API が停止している場合は、画面に再試行可能なエラーを表示します。

## 確認

- フロントエンド: `npm test && npm run lint && npm run build`
- 音声解析: `.venv/bin/python -m unittest voice_api.test_pitch`
