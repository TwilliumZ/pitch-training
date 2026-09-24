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
2. Run the app:
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

## URLを共有して遊ぶ・共有ランキング

公開したURLを各自のブラウザで開き、一人用の選択式／音声回答で遊べます。ゲーム終了後に採点結果を確認し、名前を入力して「ランキングに登録」を押すと、同じURLを利用する仲間に名前と点数が公開されます。

ランキングは難易度・回答方法・問題数・同じ音の重複設定ごとに分かれ、再練習も別集計です。上位50件を表示し、「最新の記録に更新」で仲間の新しい記録を取得します。通信に失敗しても再試行でき、同じゲームは二重登録されません。

個人の学習履歴は引き続き各ブラウザ内に保存します。共有ランキングは公開先のPostgres（ローカルではSQLite）に保存します。旧ブラウザ内ランキングや架空のサンプル記録は共有ランキングには移行しません。

### 現在の公開先

- ゲーム: https://pitch-training-nu.vercel.app/
- Vercelプロジェクト: `deep-learner1/pitch-training`
- ランキングDB: Neon `pitch-training-ranking`（Free、シンガポール）

現在はローカルの作業ブランチからVercel CLIで直接公開しています。GitHub連携は未接続のため、GitHubへpushするだけでは更新されません。更新時はテスト後にリポジトリ直下で `npx vercel deploy --prod --scope deep-learner1 --build-env VERCEL_SUPPORT_LARGE_FUNCTIONS=1` を実行します。

### Vercelで公開する

`vercel.json` がViteの画面ビルドとPython APIへの転送を設定します。`api/handler.py` が音声解析とランキングAPIの入口です。Vercel用のPython 3.12とCPU版PyTorch依存関係を `.python-version` / `requirements.txt` で指定しています。Macでのローカル開発には引き続き `requirements-voice.txt` と既存の仮想環境を使います。

1. Vercelにこの作業ブランチのコードを配置します（現在の `main` には未反映です）。
2. VercelのStorageからNeonのPostgresを作成し、対象プロジェクトへ接続します。提供される `DATABASE_URL` または `POSTGRES_URL` をサーバー環境変数に設定します。ブラウザ向けの `VITE_` 接頭辞を付けないでください。
3. Pythonの大容量関数を利用するため、Fluid computeを有効にし、必要なら `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` を設定します。
4. 再デプロイ後、公開URLで出題・音声解析・ランキング登録と取得を確認します。DBテーブルは初回アクセス時に作成されます。

VercelではローカルSQLiteへの保存を禁止し、DB未設定時は設定エラーを返します。ローカル起動ではSQLiteを引き続き利用できます。既存SQLiteの記録はNeonへ自動移行しません。公開前にNeonとの実接続とVercel上での音声解析確認が必要です。

参照: [Python Functions](https://vercel.com/docs/functions/runtimes/python/api-directory)、[大容量関数](https://vercel.com/changelog/vercel-functions-can-now-be-up-to-5-gb-in-package-size)、[Postgres連携](https://vercel.com/docs/postgres)

### 画面とAPIをまとめて起動

```bash
npm ci
npm run build
.venv/bin/uvicorn voice_api.web:app --host 127.0.0.1 --port 8080
```

http://127.0.0.1:8080 で画面とAPIの両方が動きます。このローカルURLはインターネットの仲間には共有できません。外部公開には次の配置とHTTPSが必要です。

開発時にViteを使う場合も、更新後の `voice_api.main:app` を起動してください。Viteは `/api` 全体を音声・ランキングAPIへ転送します。`VOICE_API_URL` でAPIの接続先を変更できます。

### インターネットへの公開

Docker対応のサーバーに配置し、ホスティング側でHTTPSを有効にします。Pythonと音声解析を含むため、静的ファイル専用ホスティングだけでは動きません。

```bash
docker build -t pitch-training .
docker volume create pitch-training-data
docker run -d --name pitch-training --restart unless-stopped \
  -p 127.0.0.1:8080:8000 \
  -v pitch-training-data:/app/data pitch-training
```

HTTPSのリバースプロキシから、このコンテナの8080ポートへ全パスを転送してください。ホスティングサービスが公開ポートを指定する場合は `PORT` 環境変数で設定できます。プロセスの起動は `voice_api.web:app`、ヘルスチェックは `/health` です。公開された `https://...` のURLを仲間に共有してください。音声回答にはHTTPSとブラウザのマイク許可が必要です。

ランキングDBは既定で `/app/data/leaderboard.sqlite3`（ローカル起動では `data/leaderboard.sqlite3`）です。`LEADERBOARD_DB_PATH` で変更できます。**保存先を永続ディスクへマウントしてください。** 一時ディスクのみだと再配置時に記録が消えます。実行ユーザー（DockerではUID 10001）が書き込めるように設定し、単一インスタンスで運用してください。

Renderを使う場合もDockerサービスと永続ディスクを組み合わせられます。永続ディスクには有料サービスが必要です。契約・公開先は利用者が選択してください。[Renderの永続ディスク公式案内](https://render.com/docs/disks)、[FastAPIのコンテナ配置公式案内](https://fastapi.tiangolo.com/deployment/docker/)

音声は採点のため公開先サーバーへ送信されます。アプリは録音ファイルを保存しません。ランキングはログイン不要の仲間内での比較用です。点数は回答データからサーバーで再計算しますが、本人確認や回答データの改ざん防止を備えた公式大会用の仕組みではありません。

### 共有機能の検証

```bash
.venv/bin/pip install -r requirements-test.txt
npm run build
.venv/bin/python -m unittest voice_api.test_pitch voice_api.test_leaderboard voice_api.test_web
```

## 参加者募集・チャット

ヘッダーの「仲間のひろば」から募集掲示板と全員用チャットを利用できます。
募集のタイトル・内容を投稿し、「この募集でチャット」から募集ごとの会話に参加できます。
「URLを共有」でコピーしたリンクは、該当する募集のチャットを直接開きます。

- ニックネームは12文字、募集タイトルは60文字、募集内容は1000文字、チャットは500文字まで。
- 募集は受付中を優先して50件、会話は最新100件を表示。表示中の掲示板は20秒、チャットは8秒ごとに更新します。
- 投稿データはランキングと同じPostgreSQL（ローカルではSQLite）に保存します。初回接続時に必要なテーブルを自動作成します。
- アカウント登録は不要です。ブラウザに保存したランダムな参加用トークンで自分の投稿を識別します。ブラウザのデータを消すと以前の投稿の操作権を失います。ニックネームは本人確認を行いません。
- 自分の募集の終了・再開、募集とメッセージの削除ができます。削除はデータベース上の非表示処理です。募集を終了しても会話は続けられますが、削除すると会話も閲覧できなくなります。
- 同じ参加情報からの連続投稿は募集30秒・チャット2秒の間隔に制限します。これは簡易的な制限であり、別の参加情報を作る利用者の対策には別途運用が必要です。
- API: `/api/community/posts`、`/api/community/rooms/lobby/messages`、`/api/community/rooms/{募集ID}/messages`。書き込みには参加トークンのBearer認証が必要です。

検証: `.venv/bin/python -m unittest voice_api.test_community voice_api.test_leaderboard voice_api.test_pitch voice_api.test_web`
