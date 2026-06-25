# Trilogue 現状報告書（教授向け）

## 1. プロジェクト概要

本プロジェクトは「複数のAIが会話する空間」の実現を最終目標とし、現在は Phase 1（MVP）として、**ユーザー1名とAI1体の1対1チャット基盤**を構築した。

現時点では、UI、状態管理、バックエンドAPI、LLM連携、エラーハンドリング、開発環境整備、基本ドキュメント整備まで完了している。

---

## 2. Phase 1 の達成目標と到達状況

## 2.1 目標
- 単一AIとの会話を成立させる
- 会話履歴を保持して文脈付き応答を行う
- 将来的なマルチエージェント化に耐える骨格を整備する

## 2.2 到達状況（結論）
- **達成済み**
  - 1対1チャットの送受信
  - 会話履歴の配列管理（`Message[]`）
  - バックエンド経由のLLM呼び出し
  - ローディング表示・自動スクロール・エラー表示
  - TypeScript型定義による契約統一
- **未着手/次フェーズ**
  - 永続化（DB）
  - マルチエージェント制御
  - 会話長最適化（履歴トリミング/要約）

---

## 3. 現行技術スタック

- Frontend: Next.js 16 (App Router), React, Tailwind CSS v4, lucide-react
- Backend: Next.js Route Handlers
- Language: TypeScript
- LLM: OpenAI API（`openai` SDK）
- Runtime: Node.js / npm

---

## 4. 実装済み機能（詳細）

## 4.1 UI / UX
- チャット画面（ユーザー/AIの見分けがつくバブル表示）
- 入力欄 + 送信ボタン
- 送信中の「処理中...」表示
- 新規メッセージ到着時の自動スクロール
- 送信中の多重送信防止
- API失敗時のエラー表示（画面表示 + alert）

## 4.2 状態管理
- `messages: Message[]` を中心とした単純で明確な状態管理
- 送信前にユーザー発話を楽観的に反映
- 成功時にAI応答を追記
- 失敗時でも `isLoading` を解除してUIを復帰

## 4.3 API / バックエンド
- エンドポイント: `POST /api/chat`
- 入力: `ChatRequest`（`messages: Message[]`）
- 出力: `ChatResponse`（`reply: Message`）
- 入力バリデーション実装済み
- System Instruction によるエージェント人格設定（Alpha）
- 429（レート制限）を `RATE_LIMIT` として返すエラー分類実装

---

## 5. データ契約（型）

`types/chat.ts` に以下を定義済み:
- `Role = "user" | "assistant"`
- `Message`
- `ChatRequest`
- `ChatResponse`
- `ApiError`

フロントとバックエンドで同一型を共有し、契約不整合を最小化している。

---

## 6. 現在のディレクトリ構成（主要部）

```txt
Trilogue/
├─ app/
│  ├─ api/chat/route.ts
│  ├─ page.tsx
│  ├─ layout.tsx
│  └─ globals.css
├─ types/
│  └─ chat.ts
├─ docs/
│  ├─ requirements_mvp.md
│  ├─ current_architecture.md
│  ├─ detailed_design.md
│  ├─ detailed_spec.md
│  └─ professor_status_report_phase1.md
├─ next.config.mjs
├─ tsconfig.json
└─ package.json
```

---

## 7. 開発で発生した主要課題と対応

## 7.1 Gemini API利用時
- 課題:
  - `404 model not found`
  - `429 quota exceeded`
- 対応:
  - モデルフォールバック実装
  - 429を明示的に `RATE_LIMIT` として返却
- 結果:
  - エラー分類は改善できたが、プロジェクト側クォータ問題が継続

## 7.2 OpenAI切替
- 課題:
  - 初期は `insufficient_quota`（429）
- 対応:
  - キー/課金状態を調整
- 結果:
  - `POST /api/chat 200` を確認し、実運用経路での応答成功を確認

---

## 8. 動作確認結果（現時点）

- ページ表示: 正常
- 送信処理: 正常
- API連携: 正常（200応答確認済み）
- 応答表示: 正常
- 失敗時のUI復帰: 正常

※ LLM利用は外部APIクォータに依存するため、将来的な運用では利用制限監視が必要。

---

## 9. セキュリティ/運用上の整理

- 秘密情報は `.env.local` 管理（Git除外）
- `.gitignore` 整備済み（`.env.local`, `.next`, `node_modules` 等）
- APIキーはサーバー側のみ使用（クライアント露出なし）

---

## 10. 成果物一覧

## 10.1 実装成果物
- チャットUI一式
- API Route
- 共有型定義
- Next.js稼働に必要な設定ファイル群

## 10.2 ドキュメント成果物
- 要件定義: `docs/requirements_mvp.md`
- 現行構成: `docs/current_architecture.md`
- 詳細設計: `docs/detailed_design.md`
- 詳細仕様: `docs/detailed_spec.md`
- 本報告書: `docs/professor_status_report_phase1.md`

---

## 11. Git上の進捗記録（主なコミット）

- `de2f2e5`: MVPチャットUIと型基盤の初期実装
- `2957fce`: Next.js環境整備 + Gemini版チャット基盤
- `6b34e43`: OpenAI連携へ切替 + エラー表示改善
- `1d528d1`: アーキテクチャ/詳細設計/詳細仕様ドキュメント整備

---

## 12. 残課題と次フェーズ提案

## 12.1 残課題
- 会話永続化が未実装
- プロバイダ抽象化（OpenAI/Gemini切替）が未実装
- 単一ファイルUIの分割（保守性向上）が必要
- E2E/単体テスト未整備

## 12.2 次フェーズ提案（Phase 2）
- `agentId` 導入によるマルチエージェント対応準備
- `lib/llm` 抽象化レイヤ追加
- DB導入（会話履歴保存/再開）
- エージェント間ターン制御の最小実装

---

## 13. 総括

Phase 1 の目的である「単一AIとの対話基盤」は技術的に成立しており、UI/状態管理/API契約/エラー処理の骨格が整った。  
現段階のコードと文書は、次段階のマルチエージェント化に進むための十分な基盤になっている。

