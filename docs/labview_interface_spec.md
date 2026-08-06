# Trilogue LabVIEW インターフェース仕様書（Phase 2 / HTTP直結方式）

## 0. この文書の目的

LabVIEW（以下 LV）を**クライアント**、現行の Next.js サーバーを**LLMブリッジ**として、
「LV から文字列を投げ → LV に AI の返信が返る」を最小手数で実現するための仕様。

DLL 化は当面行わず、LV 標準の **HTTP Client VIs** だけで完結させる方針。

```
[LabVIEW] --HTTP POST(JSON)--> [Next.js /api/lv/chat] --HTTPS--> [OpenAI] --reply--> [Next.js] --JSON--> [LabVIEW]
```

---

## 1. 通信経路と技術仕様（裏側の透明化）

| 項目 | 内容 |
| --- | --- |
| LV → 自作サーバー | **HTTP**（同一PCなら `http://localhost:3000`） |
| 自作サーバー → LLM | **HTTPS / REST**（`https://api.openai.com/v1/chat/completions`） |
| データ形式 | **JSON (UTF-8)** |
| 認証 | APIキーは**サーバー側の環境変数のみ**で保持。LV からは一切渡さない／見えない |
| サーバー言語 | Node.js / TypeScript（Next.js Route Handlers） |
| 主軸モデル | OpenAI `gpt-4o-mini`（環境変数 `OPENAI_MODEL` で変更可） |

### リクエストの流れ（番号順）
1. LV が `POST /api/lv/chat` に平坦JSONを送信。
2. サーバーが環境変数からAPIキーを読み、エージェント定義（人格・モデル）を付与。
3. サーバーが OpenAI へリクエスト。
4. 返信を平坦JSONに整形して LV へ返却。

複数AIをまとめて呼ぶ `/api/lv/multi`（段階B）では、上記 2〜3 を
**サーバーが発言順に沿って必要な回数だけ繰り返し**、結果をまとめて 4 で返す。
LV から見た往復は変わらず1回。

---

## 2. LabVIEW 専用エンドポイント

Web UI 用の `/api/chat`（入れ子の `messages[]` を要求）とは別に、
**LV が組み立て・解析しやすい平坦JSON**の専用エンドポイントを用意した。

### 2.1 `POST /api/lv/chat` — 対話本体

> HTTP ステータスは**常に 200**。成否は body の `ok` で判定する。
> （LV 側でステータスコード分岐をしなくて済むようにするため）

#### リクエスト（最小）
```json
{ "text": "こんにちは" }
```

#### リクエスト（フル）
```json
{
  "text": "前の話の続きを教えて",
  "agentId": "beta",
  "history": [
    { "role": "user", "content": "AIについて教えて" },
    { "role": "assistant", "content": "AIとは..." }
  ]
}
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `text` | ✅ | ユーザーの発話 |
| `agentId` | 任意 | `alpha` / `beta` / `gamma`。省略時は `alpha` |
| `history` | 任意 | 文脈を渡したい場合のみ。`role` と `content` だけの単純配列。**LVが履歴を持たないなら省略可** |

#### レスポンス（成功）
```json
{
  "ok": true,
  "reply": "こんにちは。何かお手伝いできることはありますか？",
  "agentId": "beta",
  "agentName": "Beta",
  "model": "gpt-4o-mini",
  "error": ""
}
```

#### レスポンス（失敗）
```json
{
  "ok": false,
  "reply": "",
  "agentId": "alpha",
  "agentName": "Alpha",
  "model": "gpt-4o-mini",
  "error": "LLM の利用上限に達しました。時間を置いて再試行してください。"
}
```

| フィールド | 説明 |
| --- | --- |
| `ok` | 成否フラグ。**LV はまずこれを見て分岐** |
| `reply` | AIの返信本文（失敗時は空文字） |
| `agentId` / `agentName` | 応答したエージェント（LV上で「どのAIか」を表示するのに使う） |
| `model` | 実際に使用したモデル名 |
| `error` | エラー文言（成功時は空文字） |

### 2.2 `POST /api/lv/multi` — 複数AIの一括応答（段階B）

> 1リクエストで**複数のAIに順番に発言させ、まとめて返す**エンドポイント。
> 「誰が何番目に話すか」の制御は**サーバー側**が持つため、LV は1回投げるだけでよい。
> こちらも HTTP ステータスは**常に 200**、成否は `ok` で判定する。

各AIには**直前までの発言が文脈として渡る**ため、単発の並列回答ではなく
互いの発言を読み合う会話になる（会話ログ上では発言者を `【名前】` で区別）。

#### リクエスト（最小）
```json
{ "text": "トレーニングを終えました。指が動きやすくなった気がします。" }
```
`agentIds` 省略時は**登録済みの全エージェント**が1巡発言する。

#### リクエスト（フル）
```json
{
  "text": "トレーニングを終えました",
  "agentIds": ["alpha", "beta"],
  "rounds": 2,
  "history": [
    { "role": "user", "content": "前回は少し痛みがありました" },
    { "role": "assistant", "content": "無理のない範囲で進めましょう" }
  ]
}
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `text` | ✅ | ユーザー（患者）の発話 |
| `agentIds` | 任意 | 発言させる順番。省略時は全エージェント。最大5体 |
| `rounds` | 任意 | 同じ並びを何巡させるか（1〜3）。省略時は1 |
| `history` | 任意 | 文脈を渡したい場合のみ。`/api/lv/chat` と同じ形式 |

> 総発言数（`agentIds` の数 × `rounds`）の上限は **6**。1発言＝1回のLLM呼び出しになるため、
> 応答時間と利用料が膨らまないようサーバー側で上限を設けている。

#### レスポンス（成功）
```json
{
  "ok": true,
  "turns": [
    { "order": 1, "agentId": "alpha", "agentName": "Alpha", "model": "gpt-4o-mini",
      "reply": "それは素晴らしいですね。どんなトレーニングを...", "ok": true, "error": "" },
    { "order": 2, "agentId": "beta", "agentName": "Beta", "model": "gpt-4o-mini",
      "reply": "個人差があるため、症状に応じたプログラムが重要です...", "ok": true, "error": "" }
  ],
  "transcript": "Alpha: それは素晴らしいですね。...\n\nBeta: 個人差があるため、...",
  "count": 2,
  "error": ""
}
```

| フィールド | 説明 |
| --- | --- |
| `ok` | **全発言が成功したときのみ** true |
| `turns` | 発言順（`order` は1始まり）に並んだ各AIの応答。個別の成否も持つ |
| `transcript` | 全発言を `名前: 本文` で連結した文字列 |
| `count` | `turns` の件数 |
| `error` | エラー文言（成功時は空文字） |

#### LabVIEW 側の実装を増やさないための設計

> 組み立て手順は `docs/labview_multi_build_guide.md`（既存の `Trilogue Chat.vi` を
> 複製して改造する形式）に、クリック単位でまとめてある。

- **既存VIの流用**：`ok` と `transcript` の2つだけ見れば会話が表示できる。
  `Unflatten From JSON` のサンプル型を `{ok, transcript, count, error}` のクラスタにすれば、
  配列を解析せずに済む（`turns` は無視しても壊れない）。
- **1体ずつ表示したい場合**：`turns` を配列クラスタとして受け取り、`order` 順に並べる。
- **部分成功**：1体が失敗しても残りの発言は続行される。失敗した発言は
  `turns[i].ok = false` に記録され、`transcript` には `(エラー: ...)` として現れる。

### 2.3 `GET /api/lv/agents` — エージェント一覧 / 疎通確認

LV 側のドロップダウン作成や、サーバー起動確認（ヘルスチェック）に使う。

```json
{
  "ok": true,
  "agents": [
    { "id": "alpha", "name": "Alpha", "model": "gpt-4o-mini" },
    { "id": "beta",  "name": "Beta",  "model": "gpt-4o-mini" },
    { "id": "gamma", "name": "Gamma", "model": "gpt-4o-mini" }
  ]
}
```

---

## 3. SubVI 設計の指針

「対話1回」を1つの SubVI（`Trilogue Chat.vi` 想定）に閉じ込めると再利用しやすい。

### 入出力端子（コネクタペーン）案
| 種別 | 端子 | 型 | 備考 |
| --- | --- | --- | --- |
| 入力 | `Base URL` | String | 例: `http://localhost:3000`。既定値に設定しておくと楽 |
| 入力 | `User Text` | String | 必須 |
| 入力 | `Agent ID` | String (Enum推奨) | `alpha`/`beta`/`gamma` |
| 出力 | `Reply` | String | AIの返信 |
| 出力 | `OK?` | Boolean | 成否 |
| 出力 | `Agent Name` | String | 表示用 |
| 出力 | `Error Msg` | String | 失敗理由 |

### SubVI 内部のブロック図フロー
1. **JSON組み立て**: `Flatten To JSON`（クラスタ `{text, agentId}` → JSON文字列）
2. **HTTP送信**:
   - `HTTP Client > Open Handle`
   - `Add Header` で `Content-Type: application/json`
   - `POST`（URL = `<Base URL>/api/lv/chat`、Buffer = 手順1のJSON文字列）
   - `Close Handle`
3. **JSON解析**: 受信本文を `Unflatten From JSON`（クラスタ `{ok, reply, agentId, agentName, model, error}` 指定）
4. **分岐**: `ok` で Case Structure。True→`reply` を表示、False→`error` を表示。

> ポイント: `Unflatten From JSON` のサンプル型に上記クラスタを与えるだけで、
> LV が自動的にフィールドを割り当てるため、文字列パースを手書きする必要はない。

---

## 4. 動作確認用 curl（LV実装前のサニティチェック）

```bash
# 疎通確認
curl http://localhost:3000/api/lv/agents

# 最小リクエスト
curl -X POST http://localhost:3000/api/lv/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"こんにちは"}'

# エージェント指定
curl -X POST http://localhost:3000/api/lv/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"意見をください","agentId":"beta"}'

# 複数AIの一括応答（段階B）
curl -X POST http://localhost:3000/api/lv/multi \
  -H "Content-Type: application/json" \
  -d '{"text":"トレーニングを終えました","agentIds":["alpha","beta"]}'
```

---

## 5. 起動方法とネットワーク

| 状況 | コマンド | LV から叩くURL |
| --- | --- | --- |
| LV とサーバーが同一PC | `npm run dev` | `http://localhost:3000` |
| LV が別PC（同一LAN） | `npm run dev:lan` | `http://<サーバーPCのIP>:3000` |

別PCから繋ぐ場合は、サーバーPCのファイアウォールで 3000 番ポートの受信を許可すること。

---

## 6. 第一段階（Phase 2-A）の完了条件

- [x] LV が組み立てやすい平坦JSONエンドポイント `/api/lv/chat` を公開
- [x] `agentId` でAIを切り替え可能（マルチエージェントの足場）
- [x] エージェント一覧 `/api/lv/agents` を公開
- [x] LV 側で `Trilogue Chat.vi` を作成し、文字列往復を確認（別PC間・実機で達成済み）

## 6.5 第二段階（Phase 2-B）の状況

サーバー側オーケストレーション＝「誰が何番目に話すか」をサーバーが持つ段階。

- [x] 複数AIの応答を1リクエストでまとめて返す `/api/lv/multi` を公開
- [x] 発言順の制御をサーバー側に実装（`agentIds` の並び × `rounds` 巡）
- [x] 各AIが直前までの発言を読む形にし、単発の並列回答ではなく会話にした
- [x] 1体が失敗しても残りを続行する部分成功の扱い
- [x] 実機で複数AIの連続発言を確認（Alpha→Beta の2発言）
- [x] LV 側で `transcript` を表示するVIを作成し、**別PC間・実機で往復を確認**
      （研究室Windows機のLV → LAN → サーバー、3体で約4.7秒）
- [ ] 段階C：ファシリテーターAIが発言順を動的に決める（`lib/orchestrator.ts` の
      `resolveSpeakingOrder` を差し替える形で拡張できるようにしてある）

---

## 7. 既知の制約・今後

- 会話履歴の永続化はサーバー側に無い。文脈が要るなら LV が `history` を保持して毎回送る方式（ステートレス）。
- 現状 OpenAI 固定。Gemini 等への切替は `lib/llm.ts` の差し替えで対応予定（プロバイダ抽象化は最小実装済み）。
- 有料枠が必要になった場合はキー登録・申請で対応（環境変数 `OPENAI_API_KEY` の差し替えのみでLV側の変更は不要）。
- C++ SDK の DLL 化は技術的には可能だが、当面は HTTP 直結で開発効率を優先する。
