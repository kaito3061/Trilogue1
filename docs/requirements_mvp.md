# 汎用AIチャットプラットフォーム 要件定義書（MVP / Phase 1）

## 1. プロジェクト概要

### 1.1 背景
本プロジェクトの最終目標は「複数のAIエージェントが会話する空間」の構築である。  
Phase 1（MVP）では、その土台として **ユーザー1名** と **単一AIエージェント** が安定して会話できる1対1チャット基盤を実装する。

### 1.2 Phase 1の目的
- 単一AIとのリアルタイムな対話体験を成立させる
- 会話状態（履歴）を安全かつ一貫して管理する
- 将来のマルチエージェント化を見据えた、疎結合で拡張可能な骨格を定義する
- 医療・業界固有ロジックに依存しない汎用技術基盤を確立する

### 1.3 スコープ
- 対象: 1対1チャット（User - AI Agent）
- 非対象（Phase 1では実装しない）:
  - 複数AIエージェント同士の会話オーケストレーション
  - 複数ユーザー同時接続や権限管理
  - 外部ドメイン知識に特化したプロンプト/ワークフロー

### 1.4 技術スタック
- Frontend: Next.js（App Router）, React, Tailwind CSS, lucide-react
- Backend: Next.js API Routes（Route Handlers）
- Language: TypeScript
- AI API: OpenAI API（`openai` SDK）, モデル: `gpt-4o-mini`（環境変数 `OPENAI_MODEL` で変更可）

### 1.5 技術選定の変更履歴
- Phase 1 当初は Gemini API（`gemini-1.5-flash`）を想定していたが、APIクォータ（利用制限）問題により OpenAI API（`gpt-4o-mini`）へ変更した。

---

## 2. システムアーキテクチャ

### 2.1 全体構成
システムは Next.js 単体でフロントエンドとバックエンドを同居させる。  
責務を分離し、UI/状態管理とAI呼び出しロジックを明確に切り分ける。

- クライアント（Frontend）
  - チャットUI表示
  - ユーザー入力の送信
  - メッセージ配列の状態管理
  - レスポンス待機時のローディング表示・自動スクロール
- サーバー（Backend / Route Handlers）
  - API入力のバリデーション
  - 会話履歴のOpenAI Chat Completions形式への変換
  - OpenAI API呼び出し
  - 応答テキストの整形・返却

### 2.2 主要コンポーネント（論理）
- `ChatPage`（画面コンテナ）
- `MessageList`（メッセージ表示領域）
- `MessageInput`（送信フォーム）
- `useChat`（会話状態を扱うカスタムフック）
- `POST /api/chat`（AI応答取得API）
- `OpenAIClient`（OpenAI呼び出しラッパ）
- `PromptBuilder`（System Instructionおよび履歴整形）

### 2.3 データフロー
1. ユーザーが入力し送信
2. フロントエンドが `Message` を state に追加し、`/api/chat` にPOST
3. バックエンドが会話履歴をOpenAI Chat Completions形式へ変換し、System Instruction付きで `gpt-4o-mini` を呼び出し
4. 受信したAI応答をフロントへ返却
5. フロントエンドがAIメッセージを state に反映し、画面更新・自動スクロール

---

## 3. 機能要件（Functional Requirements）

### 3.1 UI要件

#### FR-UI-01: 汎用チャット画面
- ユーザーとAIのメッセージを時系列で表示できること
- メッセージの送信者（user / assistant）が視覚的に識別できること
- 汎用UIとして、特定業界に依存する表示要素を含まないこと

#### FR-UI-02: 入力と送信
- テキスト入力欄と送信操作（ボタンまたはEnterキー）を提供すること
- 空文字・空白のみの入力は送信不可とすること
- 送信中は多重送信を抑止すること

#### FR-UI-03: ローディング表示
- AI応答待機中はローディング状態を表示すること
- ユーザーは「処理中」であることを即時に認識できること

#### FR-UI-04: 自動スクロール
- 新規メッセージ追加時に最新メッセージへ自動スクロールすること
- 長い会話でも最新発話への追従性を担保すること

### 3.2 バックエンド要件

#### FR-BE-01: OpenAI API呼び出し
- Route Handler（例: `POST /api/chat`）でOpenAI APIを呼び出すこと
- `openai` SDK を利用し、`gpt-4o-mini` を使用すること
- APIキーは環境変数管理し、クライアントへ露出しないこと

#### FR-BE-02: System Instructionによるキャラクター設定
- AIの応答方針を定義するSystem Instructionをサーバー側で適用すること
- System Instructionは将来的なキャラクター追加を見据え、差し替え可能な設計にすること

#### FR-BE-03: エラーハンドリング
- OpenAI APIエラー時に、クライアントが扱える標準エラーフォーマットを返すこと
- タイムアウト/レート制限/不正入力を識別可能なステータスコードで返却すること

### 3.3 状態管理要件（会話履歴とコンテキスト）

#### FR-ST-01: 会話履歴の保持
- フロントエンドで現在セッションのメッセージ履歴を保持すること
- 履歴は `Message[]` として一貫した型で管理すること

#### FR-ST-02: 履歴フォーマット変換
- `Message[]` をOpenAI Chat Completions が要求する履歴形式（role/content）に変換すること
- roleマッピング（`user` -> `user`, `assistant` -> `assistant`）を明示的に実装すること

#### FR-ST-03: コンテキスト引き渡し
- 毎リクエストで必要な会話履歴をバックエンドへ渡し、文脈を維持すること
- コンテキスト長に配慮し、将来的にトリミング戦略を追加可能な構造にすること

---

## 4. 非機能要件（Non-Functional Requirements）

### 4.1 拡張性

#### NFR-EXT-01: 疎結合コンポーネント設計
- UI、状態管理、APIクライアント、プロンプト構築を分離し、責務境界を明確にすること
- 単一AI前提の実装であっても、エージェント識別子追加で拡張できる構造を保持すること

#### NFR-EXT-02: API設計の将来互換
- 現行APIは1エージェント応答を返すが、将来的な「複数応答」拡張に耐えうるレスポンス設計を意識すること
- 入出力DTOはバージョニングやフィールド追加に耐える形を採用すること

### 4.2 型安全

#### NFR-TS-01: 厳密な型定義
- TypeScriptで `Message`, `ChatRequest`, `ChatResponse`, `ApiError` など主要インターフェースを定義すること
- `any` の使用を禁止し、ユニオン型/リテラル型で送信者種別・状態を表現すること

#### NFR-TS-02: 型に基づく安全な変換
- フロント内部型とOpenAIリクエスト型の変換関数を明示し、型で変換漏れを防ぐこと
- 不正なroleや空contentはコンパイル時・実行時の双方で検知できるようにすること

### 4.3 保守性・運用性
- 環境変数（例: `OPENAI_API_KEY`）の管理を明確化すること
- ログは開発時デバッグに必要十分な粒度で出力し、機密情報を含めないこと
- コンポーネント/関数はテストしやすい粒度で分割すること

### 4.4 パフォーマンス（MVP基準）
- 一般的なテキスト会話において、送信から応答表示までの待機体感を最小化すること
- 不要な再レンダリングを抑制し、会話件数増加時もUI操作性を維持すること

---

## 5. 今後の開発フェーズ（マルチエージェント化への展望）

### Phase 2: シングルユーザー × マルチエージェント化（基礎）
- エージェント識別子（`agentId`）を導入し、複数AIの発話を同一タイムラインで管理
- エージェントごとのSystem Instructionを切り替え可能にする
- 発話順序制御（turn制御）と基本的な会話ルーティングを実装

### Phase 3: オーケストレーション高度化
- 司会/要約/批評など役割別エージェントを追加
- 会話戦略（誰に次を話させるか）をポリシー化
- コンテキスト圧縮・要約メモリなど長会話向け機構を導入

### Phase 4: プラットフォーム化
- セッション永続化、履歴検索、再開機能
- 複数ユーザー対応、権限管理、監査ログ
- モデル切替（OpenAI以外を含む）に向けた抽象化レイヤー整備

---

## 付録A: 推奨インターフェース（MVP）

```ts
export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string; // ISO 8601
}

export interface ChatRequest {
  messages: Message[];
}

export interface ChatResponse {
  reply: Message;
}

export interface ApiError {
  code: "INVALID_REQUEST" | "RATE_LIMIT" | "UPSTREAM_ERROR" | "INTERNAL_ERROR";
  message: string;
}
```

## 付録B: 受け入れ基準（MVP完了判定）
- ユーザーがメッセージを送信し、単一AIから応答を受け取れること
- 会話履歴を含めた連続対話で文脈が維持されること
- ローディング表示・自動スクロール・多重送信防止が機能すること
- 主要データ構造とAPI入出力がTypeScriptで厳密に定義されていること
- 将来のマルチエージェント拡張に向け、責務分離された構造になっていること
