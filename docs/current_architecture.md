# Trilogue 現行アーキテクチャ仕様書（Phase 1 実装版）

## 1. ドキュメント目的

本ドキュメントは、現時点のアプリケーション実装（Next.js App Router + OpenAI API連携）の構造と設計意図を整理し、今後の拡張（マルチエージェント化、プロバイダ抽象化）に向けた基準点を定義する。

---

## 2. 技術スタック（現行）

- Frontend: Next.js App Router, React, Tailwind CSS, lucide-react
- Backend: Next.js Route Handlers (`app/api/chat/route.ts`)
- Language: TypeScript
- LLM Provider: OpenAI API（`openai` npm package）

---

## 3. ファイル構造

```txt
Trilogue/
├─ app/
│  ├─ api/
│  │  └─ chat/
│  │     └─ route.ts         # チャットAPI（OpenAI呼び出し）
│  ├─ globals.css            # Tailwind v4 エントリ
│  ├─ layout.tsx             # RootLayout
│  └─ page.tsx               # チャットUI + クライアント状態管理
├─ types/
│  └─ chat.ts                # Message/Request/Response/Error 型定義
├─ docs/
│  ├─ requirements_mvp.md    # 要件定義
│  └─ current_architecture.md# 本書
├─ next.config.mjs
├─ package.json
└─ tsconfig.json
```

---

## 4. コンポーネント責務

## 4.1 `app/page.tsx`（UI + 状態管理）
- メッセージ配列 `messages: Message[]` を単一の情報源として保持
- 入力値 `input`、送信中状態 `isLoading`、エラー文言 `errorMessage` を管理
- 送信処理 `handleSubmit` で以下を実施
  - ユーザー発話を state へ即時反映
  - `/api/chat` に `ChatRequest`（`{ messages: nextMessages }`）をPOST
  - 成功時: `ChatResponse.reply` をメッセージ末尾に追加
  - 失敗時: APIエラーメッセージをUI表示し、`alert` でも通知
- `useRef + useEffect` により新着メッセージ時の自動スクロールを実施

## 4.2 `app/api/chat/route.ts`（API層）
- `OPENAI_API_KEY` の存在検証
- リクエストJSONを `ChatRequest` として解釈し、最低限の入力バリデーションを実施
  - `messages` 配列必須
  - 各メッセージの `role`, `content` 妥当性確認
- OpenAI Chat Completions API 呼び出し
  - `OPENAI_MODEL` 未指定時は `gpt-4o-mini`
  - System Instruction を `system` メッセージとして先頭に注入
- 応答テキストを `ChatResponse` 形式に正規化して返却
- 例外時は `ApiError` を返却
  - 429 -> `RATE_LIMIT`
  - その他 -> `UPSTREAM_ERROR`

## 4.3 `types/chat.ts`（共有型）
- `Role`: `"user" | "assistant"`
- `Message`: 会話単位データ構造
- `ChatRequest`: API入力
- `ChatResponse`: API成功応答
- `ApiError`: API失敗応答

---

## 5. データフロー

1. ユーザーが入力して送信
2. フロントが `user` メッセージを `messages` に追加
3. フロントが `POST /api/chat` を実行（全履歴を送信）
4. バックエンドが OpenAI API を呼び出し
5. バックエンドが `reply: Message` を返却
6. フロントが `assistant` メッセージを追加して描画更新

---

## 6. エラーハンドリング方針

## 6.1 サーバー側
- 入力不正: `400 INVALID_REQUEST`
- キー未設定: `500 INTERNAL_ERROR`
- レート制限: `429 RATE_LIMIT`
- 外部API異常: `502 UPSTREAM_ERROR`

## 6.2 クライアント側
- 非200レスポンス時、`ApiError.message` を優先表示
- `errorMessage` 表示 + `alert` により即時通知
- 失敗時も `finally` で `isLoading` を解除し、UIハングを防止

---

## 7. 環境変数仕様

- `OPENAI_API_KEY`（必須）
  - OpenAI API 認証用キー
- `OPENAI_MODEL`（任意）
  - 未指定時 `gpt-4o-mini`

`.env.local` で管理し、Git管理対象外（`.gitignore`）とする。

---

## 8. 設計上の特徴

- 単純な1ファイルUI構成でMVP速度を優先
- APIレスポンスを厳密な共有型で整形し、フロント/バックの契約を明確化
- 会話履歴を毎回送ることで文脈維持を実現（サーバーセッション非依存）
- Provider変更の影響を `route.ts` に概ね限定できる構造

---

## 9. 既知の制約

- 会話履歴は永続化されない（リロードで消える）
- 長会話時のトークン増加対策（トリミング/要約）が未実装
- `alert` ベースの通知はUX上改善余地あり
- LLMプロバイダ抽象化（OpenAI/Gemini切替）は未実装

---

## 10. 次フェーズ推奨タスク

- `lib/llm/` 層を新設し、OpenAI/Geminiを同一インターフェースで抽象化
- 会話永続化（DB or local storage）とセッション再開機能
- 履歴トリミング/要約によるコンテキスト制御
- UI通知をトースト化し、エラー体験を改善
- テスト追加（API Routeのバリデーション/エラー分岐）

