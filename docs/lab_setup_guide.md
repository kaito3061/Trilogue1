# Trilogue 研究室セットアップガイド

> 目的: 研究室メンバーが、このサーバーを自分のPCで動かし、LabVIEW から接続できるようにするための手順。
> 前提知識は最小限でよいよう、コマンドを順番に書いています。

---

## 0. このシステムは何か（30秒）

- LabVIEW から文字列を送ると、サーバー経由で LLM（OpenAI）に問い合わせ、AIの返信が LabVIEW に返る。
- 複数AIに順番に発言させ、会話をまとめて返すこともできる（段階B / `/api/lv/multi`）。
- サーバーは Next.js（Node.js）製の自作API。**既製のLLMツール（Dify / Flowise / LiteLLM / NextChat /
  OpenWebUI 等）は不使用**。実行環境として Docker を利用できる（Docker無しでも動く）。
- 詳細は `docs/system_architecture.md`（システム構成資料）を参照。

---

## 1. 必要なもの

起動方法は2ルートある。**どちらか一方**でよい。

| ルート | 必要なもの | 向いている人 |
| --- | --- | --- |
| **A: Docker**（推奨） | Docker Desktop のみ | Node.js を入れたくない／環境を汚したくない人。**Windows推奨** |
| **B: Node.js** | Node.js v20 以上（`node -v` で確認） | 開発してコードを触る人 |

共通で必要なもの:

| 項目 | 内容 |
| --- | --- |
| OpenAI APIキー | 有料利用枠のあるキー。研究室の登録キーを使用 |
| LabVIEW | 2016 以降（HTTP Client VIs / JSON VIs を使用） |

---

## 2. サーバーのセットアップ

### ① 取得と依存インストール
リポジトリを取得したフォルダで:

```bash
npm install
```

### ② APIキーの設定
テンプレート `.env.local.example` をコピーして `.env.local` を作り、自分のキーを記入する:

```bash
cp .env.local.example .env.local
# 作成した .env.local を開き、OPENAI_API_KEY= に自分のキーを設定
```

`.env.local` の中身:
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
# 任意: モデルを変えたい場合
OPENAI_MODEL=gpt-4o-mini
```

> ⚠ **キーは各自の `.env.local` に置くこと。共有物（リポジトリ・ドキュメント・チャット等）に実キーを絶対に入れない。**
> `.env.local` は `.gitignore` 済みで追跡されない。リポジトリに含めてよいのはプレースホルダのみの `.env.local.example` のみ。

---

## 3. サーバーの起動

### ルートA: Docker で起動（推奨・Node.js不要）

リポジトリのフォルダで、次の1コマンドだけ。

```bash
docker compose up --build
```

- 初回はイメージ作成に数分かかる（2回目以降は数秒）。
- ログに `Ready` が出れば起動完了。
- **同一PCからも別PC（同一LAN）からも** `http://<このPCのIP>:3000` で到達できる
  （コンテナは `0.0.0.0` で待ち受け、3000番をホストに公開しているため）。
- 停止は `Ctrl + C`、バックグラウンド起動は `docker compose up -d`、停止は `docker compose down`。

> ⚠ ルートAでも **手順2-②の `.env.local` は必要**。`docker-compose.yml` が
> `.env.local` を読み込んでコンテナに渡す（APIキーはイメージに焼き込まれない）。
> `npm install` は不要（コンテナ内で実行される）。

### ルートB: Node.js で起動

| 用途 | コマンド | 接続先 |
| --- | --- | --- |
| 同じPCのLabVIEWから使う | `npm run dev` | `http://localhost:3000` |
| 別PCのLabVIEWから使う（同一LAN） | `npm run dev:lan` | `http://<サーバーPCのIP>:3000` |

起動後、ログに `Ready` と表示されればOK。

### サーバーPCのIP確認
- macOS: `ipconfig getifaddr en0`
- Windows: `ipconfig`（`IPv4 アドレス` を見る）

---

## 3.5 Windows で動かす場合（研究室PC向け・つまずき実績あり）

研究室のWindows機では、`git` / `npm` / `winget` がどれも未インストールで詰まった実績がある。
**Docker Desktop だけ入れる**のが最短。Node.js も Git も不要になる。

### 手順
1. **リポジトリを取得**（Git不要）
   - GitHub のページ右上 `Code` → **`Download ZIP`** → 展開。
   - 展開先の例: `C:\Users\<ユーザー名>\Desktop\Trilogue`
2. **Docker Desktop をインストール**
   - <https://www.docker.com/products/docker-desktop/> から Windows 版を入れる。
   - インストール後にPCを再起動し、Docker Desktop を起動して
     左下が緑（`Engine running`）になるまで待つ。
3. **`.env.local` を作る**
   - `.env.local.example` をコピーして `.env.local` にリネームし、`OPENAI_API_KEY=` に自分のキーを記入。
   - ⚠ エクスプローラーで拡張子が隠れていると `.env.local.txt` になりやすい。
     `表示 > ファイル名拡張子` にチェックを入れて確認する。
4. **起動**
   - 展開したフォルダで、アドレスバーに `cmd` と打って Enter（そのフォルダでコマンドプロンプトが開く）。
   - 次を実行:
     ```bat
     docker compose up --build
     ```
5. **確認**
   - ブラウザで `http://localhost:3000/api/lv/agents` を開き、エージェント一覧のJSONが出ればOK。

### Windows特有の注意
- **ファイアウォール**：別PCのLabVIEWから繋ぐ場合、初回起動時に出る
  「Windows セキュリティの重要な警告」で**アクセスを許可**する（プライベートネットワークにチェック）。
  出なかった場合は「受信の規則」で TCP 3000 を許可。
- **IPの確認**：`ipconfig` を実行し、`IPv4 アドレス`（例 `192.168.3.13`）を見る。
  `ifconfig` は Windows には無い。
- **WSL2**：Docker Desktop が要求したら指示どおり有効化する（再起動が必要）。

---

## 4. 疎通確認（LabVIEWの前に必ず）

サーバーが応答するか、ブラウザかコマンドで確認する。

ブラウザ:
```
http://<サーバーIP>:3000/api/lv/agents
```

コマンド（Pythonの検証スクリプト。標準ライブラリのみ・pip不要）:
```bash
python3 scripts/lv_roundtrip_check.py --base-url http://<サーバーIP>:3000
```

`ALL PASS` が出れば、サーバー側は正常。これ以降の問題はLV側、と切り分けられる。

---

## 5. LabVIEW から接続する

VIの作り方（どの部品をどう配線するか）はクリック単位で記載してある。

| やりたいこと | 手順書 |
| --- | --- |
| 単体AIと1往復する | `docs/labview_build_guide.md` |
| 複数AIに順番に発言させる（段階B） | `docs/labview_multi_build_guide.md` |

API仕様（JSON構造・SubVI入出力）は **`docs/labview_interface_spec.md`** を参照。

最小の流れ:
1. `Base URL` に `http://<サーバーIP>:3000` を入力（末尾スラッシュなし）。
2. `User Text` に発話、`Agent ID` に `alpha`（または `beta` / `gamma`）。
3. Run → `Reply` にAI返信が出れば成功。

> 複数AI版（`/api/lv/multi`）は**AIの数に比例して待ち時間が伸びる**（3体で約5秒）。
> LabVIEW の `POST` は既定10秒でタイムアウトするため、`timeout (ms)` を `120000` に伸ばすこと。

---

## 6. 別PC間で繋ぐときの注意

1. **同一ネットワーク必須**: サーバーPCとLabVIEW PCが同じWi-Fi/LAN（同じ `192.168.x` 等）にいること。
2. **サーバー側のファイアウォール**: 3000番ポートの着信を許可。
   - macOS: 初回アクセス時の「`node` の着信を許可しますか？」で許可。
   - Windows: 受信規則で TCP 3000 を許可。
3. **IPは変わりうる**（DHCP）。繋がらなくなったら再確認する。

---

## 7. トラブルシュート

| 症状 | 原因の当たり | 対処 |
| --- | --- | --- |
| ブラウザで `/api/lv/agents` が開かない | ネットワーク or ファイアウォール | 同一LANか確認 → 3000番許可 |
| `OK?` が光らない / `Reply` が空 | クラスタのラベル名違い | `reply`/`agentId`/`agentName` 等を大小文字まで一致 |
| `ok:false` で `error` が入る | 入力不正 or APIキー/レート制限 | `error` 文言を確認。429ならレート制限 |
| サーバー起動時に「APIキー未設定」 | `.env.local` 未作成 | 手順2-②を実施 |
| ポート3000が使用中 | 既に起動済み | 既存プロセスを停止するか別ポートを使用 |
| `git` / `npm` / `winget` が「認識されていません」 | 未インストール（Windowsで多い） | ルートA（Docker）に切り替える。ZIP取得＋Docker Desktop だけで動く |
| `docker compose` で `.env.local` が無いと言われる | ファイル名が `.env.local.txt` 等 | 拡張子表示を有効にして名前を修正 |
| `Unflatten From JSON` でクラスタ要素のエラー | LV側のラベルがJSONに存在しない | `docs/labview_multi_build_guide.md` のエラー別対処を参照 |

---

## 8. 主要ファイルの場所（開発者向け）

| 役割 | 場所 |
| --- | --- |
| LV用エンドポイント | `app/api/lv/chat/route.ts`, `app/api/lv/multi/route.ts`, `app/api/lv/agents/route.ts` |
| エージェント定義（人格・モデル） | `lib/agents.ts` |
| 発言順の制御・複数AIの実行 | `lib/orchestrator.ts` |
| LLM呼び出し共通部品 | `lib/llm.ts` |
| 型定義（API契約） | `types/chat.ts` |
| 検証スクリプト | `scripts/lv_roundtrip_check.py` |
| 各種ドキュメント | `docs/` |

### エージェントを増やす・変えるには
`lib/agents.ts` の `AGENTS` にエントリを追加するだけ（`id` / `name` / `systemInstruction` / `model`）。
追加した `id` を LabVIEW の `Agent ID` に指定すれば、そのまま使える。
