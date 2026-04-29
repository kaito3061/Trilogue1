# Trilogue 詳細設計書（Phase 1 / OpenAI版）

## 1. 目的

本書は、現行MVP（1対1チャット）の実装詳細を設計レベルで定義し、保守・機能追加・リファクタリング時の判断基準を提供する。

---

## 2. 設計スコープ

- 対象
  - `app/page.tsx`（UI + クライアント状態管理）
  - `app/api/chat/route.ts`（チャットAPI）
  - `types/chat.ts`（共有データ契約）
- 非対象
  - 認証/認可
  - DB永続化
  - マルチユーザー/マルチエージェントオーケストレーション

---

## 3. 論理アーキテクチャ

## 3.1 レイヤ分離

- Presentation Layer
  - チャット画面描画、入力UI、ローディング、エラー表示
- Application Layer
  - 送信ユースケース（入力検証、state更新、API呼び出し）
- Infrastructure Layer
  - OpenAI API 呼び出し、HTTPレスポンス整形
- Contract Layer
  - `Message`, `ChatRequest`, `ChatResponse`, `ApiError` による型契約

## 3.2 依存方向

- `page.tsx` -> `types/chat.ts`
- `route.ts` -> `types/chat.ts`
- `page.tsx` -> `/api/chat`（HTTP）
- `route.ts` -> OpenAI SDK

※ UIはSDKに直接依存しない（API境界で分離）。

---

## 4. 画面設計（`app/page.tsx`）

## 4.1 状態変数

- `messages: Message[]`
  - 会話履歴の唯一の情報源
- `input: string`
  - 入力中テキスト
- `isLoading: boolean`
  - 送信中フラグ（多重送信抑止）
- `errorMessage: string | null`
  - 直近エラー文言
- `endRef: RefObject<HTMLDivElement>`
  - 自動スクロール終端要素

## 4.2 イベント設計

### `handleSubmit(event)`
- 前提条件
  - `input.trim().length > 0`
  - `isLoading === false`
- 処理
  1. `userMessage` 生成（UUID + ISO日時）
  2. `nextMessages = [...messages, userMessage]`
  3. `messages` 更新 / `input` クリア / `isLoading=true`
  4. `POST /api/chat` に `nextMessages` 送信
  5. 成功時: `data.reply` を `messages` 末尾へ追加
  6. 失敗時: `errorMessage` と `alert` を表示
  7. `finally` で `isLoading=false`

## 4.3 描画設計

- 送信者別スタイル
  - `user`: 右寄せ / 青系
  - `assistant`: 左寄せ / ダーク枠
- 表示分岐
  - `messages.length === 0`: 初期案内表示
  - `isLoading === true`: 「処理中...」バブル表示
  - `errorMessage != null`: エラーテキスト表示

## 4.4 自動スクロール

- トリガー: `messages`, `isLoading` の変更
- 動作: `endRef.current?.scrollIntoView({ behavior: "smooth" })`

---

## 5. API設計（`app/api/chat/route.ts`）

## 5.1 エンドポイント

- Method: `POST`
- Path: `/api/chat`
- Content-Type: `application/json`

## 5.2 リクエスト処理フロー

1. `OPENAI_API_KEY` 存在確認
2. `request.json()` から `messages` 取得
3. 入力バリデーション
   - 配列であること
   - 空でないこと
   - 各要素が `role in {user, assistant}` を満たすこと
   - `content` が空白のみでないこと
4. OpenAIへ問い合わせ
5. 応答テキスト抽出
6. `ChatResponse` へ変換して返却

## 5.3 OpenAI呼び出し設計

- SDK: `openai`
- モデル
  - 優先: `process.env.OPENAI_MODEL`
  - 既定: `gpt-4o-mini`
- プロンプト構成
  - 先頭に `system` メッセージ（Alpha設定）
  - 続いて会話履歴（`user` / `assistant`）

## 5.4 レスポンス設計

- 正常系: `200 OK` + `ChatResponse`
- 異常系:
  - `400 INVALID_REQUEST`
  - `429 RATE_LIMIT`
  - `500 INTERNAL_ERROR`
  - `502 UPSTREAM_ERROR`

---

## 6. データモデル設計（`types/chat.ts`）

## 6.1 `Role`

- 列挙: `"user" | "assistant"`
- 目的: 表示分岐およびLLMロール変換の安全性担保

## 6.2 `Message`

- `id: string`
- `role: Role`
- `content: string`
- `createdAt: string`（ISO 8601）

## 6.3 API DTO

- `ChatRequest`
  - `messages: Message[]`
- `ChatResponse`
  - `reply: Message`
- `ApiError`
  - `code: "INVALID_REQUEST" | "RATE_LIMIT" | "UPSTREAM_ERROR" | "INTERNAL_ERROR"`
  - `message: string`

---

## 7. 例外/障害設計

## 7.1 想定異常

- APIキー未設定
- 不正JSON/不正role/空入力
- LLM応答空文字
- レート制限（429）
- 上流通信失敗（5xx）

## 7.2 回復方針

- UIは処理中フラグを必ず解除（`finally`）
- エラー文言をユーザーへ即時通知
- サーバーログに詳細を残し、クライアントには安全な要約文言を返す

---

## 8. セキュリティ設計

- APIキーは `OPENAI_API_KEY` でサーバー側のみ参照
- `.env.local` はGit管理外
- クライアントからキーへ直接アクセス不可
- エラー応答に内部スタックトレースを含めない

---

## 9. 拡張設計指針

- `lib/llm/provider.ts` を導入しプロバイダ抽象化（OpenAI/Gemini）
- `agentId` 導入でメッセージモデルを拡張（将来のマルチエージェント）
- 履歴トリミング戦略（件数/トークン上限）を追加
- 永続化導入時は `Message` をDBスキーマへ正規化

---

## 10. 実装ガイドライン

- 型は `types/chat.ts` を単一参照元にする
- 画面ロジックは `handleSubmit` 中に閉じ込め、責務を拡散させない
- APIのエラーコード追加時は `ApiError.code` ユニオン型を同時更新する
- 文言変更時は UI/API 双方で整合するように調整する

