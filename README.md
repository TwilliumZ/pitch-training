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

Intel MacではPython 3.10〜3.12を使用してください。`requirements-voice.txt` は環境を判別し、Intel Macにはtorch/torchaudio 2.2.2とNumPy 1.26.4、それ以外にはtorch/torchaudio 2.8.0とNumPy 2.2.6を導入します。

マイク利用には `localhost` または HTTPS が必要です。音声解析 API が停止している場合は、画面に再試行可能なエラーを表示します。

## 確認

- フロントエンド: `npm test && npm run lint && npm run build`
- 音声解析: `.venv/bin/python -m unittest voice_api.test_pitch`

## 録音・採点の仕様

- 録音中の表示から約2秒発声してください。録音枠は反応時間を含め3秒です。解析の最小長0.25秒は短すぎる入力の拒否条件であり、推奨発声時間ではありません。
- 録音には AudioWorklet 対応ブラウザを使用します。録音前にアプリの再生音を停止し、録音中の再生も抑止します。室内の残響や外部音対策にはイヤホンを推奨します。
- 声域の違いを許容するため、検出音をC4〜C5に移して採点します。C4とC5は維持し、範囲外の低いドはC4、高いドはC5に対応します。絶対音高・オクターブの正確さを採点するモードではありません。
- 結果の認識信頼度は音程の安定性と音量から算出する目安です。正解確率や歌唱能力の評価ではありません。
- 表示・採点の音名は `src/utils/notesData.ts` の `ALL_NOTES` が正です。Pythonの `noteName` は補正前の実測音を示す診断用です。
- torch/torchaudioは既存の検出精度を維持するため継続使用します。軽量化は低声・倍音・雑音を含む録音で精度と処理時間を比較してから判断します。

## 本番配置（同一オリジン）

`npm run build` の `dist/` をHTTPSで配信し、同じホストの `/api/pitch` をFastAPIの `/pitch` へ転送します。Viteの `server.proxy` は開発用で、静的配信には適用されません。以下を既存のNginx HTTPS `server` ブロックへ追加してください（配置パスは環境に合わせて変更）。

```nginx
root /srv/pitch-training/dist;
location / {
    try_files $uri $uri/ /index.html;
}
location = /api/pitch {
    client_max_body_size 6m;
    proxy_pass http://127.0.0.1:8000/pitch;
    proxy_read_timeout 30s;
}
```

FastAPIは `.venv/bin/uvicorn voice_api.main:app --host 127.0.0.1 --port 8000` などで常駐させます。同一オリジン構成ならCORSの追加は不要です。静的ホスティングでも同様の転送ルールが必要です。解析はスレッドプールで実行しますが、CPU・メモリは有限なので想定同時人数で負荷を確認してください。

実機確認: スピーカー再生直後の録音、録音中の再生操作、マイク許可待ち中の画面遷移、無音・低い声・発声開始が遅い場合を確認してください。
