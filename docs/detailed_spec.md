# Trilogue 詳細仕様書（Phase 1 / OpenAI版）

## 1. 概要仕様

- アプリ種別: 単一ユーザー × 単一AI のチャットアプリ
- 実行環境: Next.js App Router
- API方式: サーバー経由の OpenAI Chat Completions
- 永続化: なし（メモリ上のセッション状態のみ）

---

## 2. 機能仕様

## 2.1 チャット送信機能

### 仕様ID
- `FS-CHAT-001`

### 入力
- ユーザーのテキスト入力（非空白）

### 事前条件
- `isLoading === false`
- `input.trim().length > 0`

### 処理仕様
1. ユーザーメッセージを生成して履歴へ追加
2. `POST /api/chat` 実行
3. 受信したAI返信を履歴へ追加
4. ローディング状態を解除

### 出力
- チャット一覧にユーザー発話とAI発話が表示される

### 例外
- APIエラー時は画面へエラー文言を表示し、送信可能状態へ復帰

---

## 2.2 自動スクロール機能

### 仕様ID
- `FS-CHAT-002`

### 処理仕様
- `messages` または `isLoading` 変更時に末尾要素へスクロール

### 期待結果
- 常に最新メッセージが視認できる

---

## 2.3 ローディング表示機能

### 仕様ID
- `FS-CHAT-003`

### 処理仕様
- API通信中に「処理中...」を表示
- 入力欄と送信ボタンを実質ロック（多重送信防止）

---

## 2.4 エラー通知機能

### 仕様ID
- `FS-CHAT-004`

### 処理仕様
- API失敗時、`ApiError.message` を優先して表示
- 画面内エラー表示 + `alert` を同時実行

### 表示文言例
- `OpenAI API の利用上限に達しました。時間を置いて再試行してください。`

---

## 3. API仕様

## 3.1 `POST /api/chat`

### リクエスト

```json
{
  "messages": [
    {
      "id": "string",
      "role": "user",
      "content": "こんにちは",
      "createdAt": "2026-04-30T00:00:00.000Z"
    }
  ]
}
```

### 成功レスポンス（200）

```json
{
  "reply": {
    "id": "string",
    "role": "assistant",
    "content": "こんにちは。どのようにお手伝いできますか？",
    "createdAt": "2026-04-30T00:00:01.000Z"
  }
}
```

### 失敗レスポンス（共通）

```json
{
  "code": "INVALID_REQUEST | RATE_LIMIT | UPSTREAM_ERROR | INTERNAL_ERROR",
  "message": "エラー説明"
}
```

### ステータスコード定義

- `200`: 正常
- `400`: 入力形式不正
- `429`: 上流レート制限
- `500`: サーバー設定不備（APIキー未設定等）
- `502`: 上流依存障害

---

## 4. 入力バリデーション仕様

## 4.1 クライアント側

- 空文字/空白のみ送信禁止
- 送信中は送信操作無効

## 4.2 サーバー側

- `messages` が配列か
- `messages.length > 0` か
- 各要素の `role` が `user|assistant` か
- `content` が文字列で空白のみでないか

---

## 5. OpenAI連携仕様

- SDK: `openai`
- APIキー環境変数: `OPENAI_API_KEY`（必須）
- モデル環境変数: `OPENAI_MODEL`（任意 / default `gpt-4o-mini`）
- System Instruction:
  - 「あなたはシステム上の最初のエージェント『Alpha（アルファ）』です。親切で簡潔に対話を行ってください。」

---

## 6. 画面UI仕様

## 6.1 メッセージ表示

- `user`: 右寄せ、青背景、`User` アイコン
- `assistant`: 左寄せ、ダーク背景、`Bot` アイコン
- 初期時: 空状態メッセージ表示

## 6.2 入力エリア

- テキスト入力欄 + 送信ボタン
- Enter送信（フォームsubmit）
- 送信不可条件:
  - `isLoading`
  - `input.trim().length === 0`

---

## 7. 非機能仕様

## 7.1 型安全

- API契約を `types/chat.ts` に集約
- フロント/バックで同一型を利用

## 7.2 保守性

- API境界を `/api/chat` に限定しUIとLLM依存を分離
- プロバイダ変更時の改修面を `route.ts` 中心に局所化

## 7.3 セキュリティ

- APIキーはサーバーのみ保持
- `.env.local` をリポジトリへ含めない

---

## 8. 制約事項

- 会話履歴の永続化なし
- 大量履歴でのトークン最適化未実装
- `alert` 依存の通知は簡易実装

---

## 9. 受け入れ基準（現行版）

- メッセージ送信後に `POST /api/chat` が呼ばれる
- 正常時に `assistant` 返信が表示される
- 429時に `RATE_LIMIT` とユーザー向け文言が表示される
- APIキー未設定時に `INTERNAL_ERROR` を返す
- 入力不正時に `INVALID_REQUEST` を返す

