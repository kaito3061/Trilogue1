# Trilogue — LabVIEW から大規模言語モデル（LLM）を利用するための接続基盤

松田研究室 卒業研究（柴尾）。
研究室の計測系は LabVIEW で作られているため、**LabVIEW から HTTP で文字列を投げるだけで
LLM と対話できる**ようにするサーバーを実装した。
複数のAIを順番に発言させる制御はサーバー側が持つので、LabVIEW 側に会話のロジックは要らない。

```
LabVIEW  ──HTTP/JSON──▶  このサーバー(Next.js)  ──HTTPS──▶  LLM (OpenAI API)
   │                          │
   │  1回投げるだけ            │  発言順の制御・履歴の受け渡し・APIキーの保持
   ◀──── 会話全文が返る ───────┘
```

APIキーはサーバー側だけが持ち、**LabVIEW には渡さない**。

---

研究室の学生が使う場合は、まず **`docs/user_manual.md`** を上からなぞる。
プログラミングは前提にしない。Windows の研究室PC向けに書いてある。

---

## 1. 動かす

### Docker を使う場合（Node.js も Git も不要）

```bash
cp .env.local.example .env.local   # OPENAI_API_KEY を書き込む
docker compose up --build
```

`http://localhost:3000` で起動する。
別のPC（LabVIEW機）から使う場合は `http://<サーバーPCのIP>:3000` を指定する。

### Node.js を直接使う場合

```bash
npm install
cp .env.local.example .env.local   # OPENAI_API_KEY を書き込む
npm run dev        # 自分のPCからのみ
npm run dev:lan    # 同じLANの他PC（LabVIEW機）からも見えるようにする
```

### 動作確認

```bash
python3 scripts/lv_roundtrip_check.py --base-url http://localhost:3000
```

LabVIEW を立ち上げなくても、LabVIEW と同じ手順でサーバーを叩いて結果を確認できる。

研究室の LabVIEW 機では、`labview/` の VI を開いてそのまま使える。

| ファイル | 接続先 | 用途 |
| --- | --- | --- |
| `labview/chat.vi` | `POST /api/lv/chat` | AI 1体との往復 |
| `labview/multichat.vi` | `POST /api/lv/multi` | 1回送ると複数AIが順番に発言する |

フロントパネルの URL を、サーバーを動かしている PC のアドレスに合わせてから実行する
（同じ PC なら `http://localhost:3000`、別 PC なら `http://<サーバーPCのIP>:3000`）。

---

## 2. LabVIEW 向けエンドポイント

LabVIEW 側の実装を増やさないため、次の3点を全エンドポイント共通の約束にしている。

- **JSON は入れ子にしない**（クラスタ1つで送受信できる）
- **HTTPステータスは常に 200**。成否は本文の `ok` で判定する（Case Structure 1つで済む）
- 複数AIの会話は、発言の配列 `turns[]` に加えて**連結済みの文字列 `transcript`** も返す

| メソッド | パス | 用途 |
| --- | --- | --- |
| POST | `/api/lv/chat` | AI 1体との往復 |
| POST | `/api/lv/multi` | 複数AIが順番に発言（サーバーが発言順を制御） |
| GET | `/api/lv/agents` | 利用できるAIの一覧 |
| POST | `/api/chat` | ブラウザ用（動作確認画面から使う） |

### `/api/lv/multi` の例

```jsonc
// リクエスト
{
  "text": "リハビリのトレーニングを終えました。指が少し動きやすくなった気がします。",
  "agentIds": ["alpha", "beta", "gamma"],   // 省略可。既定は登録順
  "rounds": 1                               // 省略可。何巡させるか
}
```

```jsonc
// レスポンス（HTTPは常に200）
{
  "ok": true,
  "count": 3,
  "transcript": "Alpha: ...\n\nBeta: ...\n\nGamma: ...",
  "turns": [
    { "order": 1, "agentId": "alpha", "agentName": "Alpha", "model": "gpt-4o-mini",
      "reply": "...", "ok": true, "error": "" }
  ],
  "error": ""
}
```

一部のAIだけ失敗した場合も 200 を返し、失敗した発言の `ok` が `false` になる
（会話全体が落ちないようにするため）。

---

## 3. 構成

```
app/
  api/chat/            ブラウザ用チャットAPI
  api/lv/chat/         LabVIEW用（AI 1体）
  api/lv/multi/        LabVIEW用（複数AI・発言順はサーバーが制御）
  api/lv/agents/       登録されているAIの一覧
  page.tsx             動作確認用の画面
lib/
  agents.ts            AIの定義（ID・名前・人格・モデル）
  orchestrator.ts      発言順の決定と実行。ここが複数AI会話の中核
  llm.ts               LLM呼び出し（タイムアウト・エラー整形）
  history.ts           会話履歴の受け取りと検証
  limits.ts            文字数・エージェント数・発言数の上限
types/chat.ts          リクエスト/レスポンスの型（LabVIEW側の仕様と1対1で対応）
tests/api.test.ts      各エンドポイントの自動テスト
labview/               LabVIEW の VI（chat.vi / multichat.vi）
scripts/               動作確認スクリプト
docs/                  設計資料・LabVIEW側の作成手順
```

**発言順を「決める処理」と「実行する処理」を分けてある**（`lib/orchestrator.ts`）。
現在は固定順だが、司会役のAIが次の発話者を決める方式にする際は、決める部分だけを
差し替えれば済む。

### AIを増やす・変える

`lib/agents.ts` に1件足すだけでよい。エージェントごとに `model` を指定できるため、
「同じモデルに別々の人格を与える」構成と「別々のモデルを使う」構成を、
コードを変えずに切り替えられる。

### テスト

```bash
npm test
```

---

## 4. 安全側に倒してある点

| 項目 | 値 | 理由 |
| --- | --- | --- |
| 履歴の上限 | 直近20件 | 会話が伸びてもトークン量と料金が発散しないように |
| 1発話の文字数 | 8000字 | 巨大な入力でLLM呼び出しが詰まるのを防ぐ |
| LLMのタイムアウト | 60秒 | 応答が返らないときに無限に待たない |
| エージェント数 | 最大5体 | 1発言＝1回のLLM呼び出しのため |
| 総発言数 | 最大6発言 | エージェント数 × 巡回数の上限 |

APIキーは `.env.local` に置き、`.gitignore` で除外している。
Dockerイメージにも焼き込まず、起動時に環境変数として渡す。

---

## 5. ドキュメント

| ファイル | 内容 |
| --- | --- |
| `docs/user_manual.md` | **他の学生向けの使い方**（ZIP取得 → 起動 → LabVIEW） |
| `docs/lab_setup_guide.md` | 研究室のPCでサーバーを立てる手順（Windows / macOS） |
| `docs/labview_interface_spec.md` | LabVIEW ⇄ サーバー間のJSON仕様 |
| `docs/system_architecture.md` | 現状（As-Is）と将来構成（To-Be） |
| `docs/architecture_decision_records.md` | 「なぜその作りにしたか」の記録 |
| `docs/requirements_mvp.md` | 要件定義 |

> このブランチ（`review/handover`）には、**コードと引き継ぎに必要な資料だけ**を置いている。
> 発表資料・報告書・生成物（pptx / mp4 / pdf）は `develop` ブランチにある。
