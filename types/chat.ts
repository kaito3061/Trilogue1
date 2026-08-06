export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string; // ISO 8601
}

export interface ChatRequest {
  messages: Message[];
  agentId?: string;
}

export interface ChatResponse {
  reply: Message;
}

export interface ApiError {
  code: "INVALID_REQUEST" | "RATE_LIMIT" | "UPSTREAM_ERROR" | "INTERNAL_ERROR";
  message: string;
}

// --- LabVIEW 向けフラットな契約 ---------------------------------------------
// LabVIEW の HTTP Client VIs から組み立て/解析しやすいよう、
// 入出力ともに「単純な平坦JSON」に寄せた形。

export interface LvChatRequest {
  /** ユーザーの発話（必須） */
  text: string;
  /** 使用するエージェント。省略時は alpha */
  agentId?: string;
  /** 文脈を渡したい場合のみ。省略可。role と content だけの単純配列 */
  history?: Array<{ role: Role; content: string }>;
}

export interface LvChatResponse {
  /** 成功なら true。LabVIEW 側はまずこれだけ見れば分岐できる */
  ok: boolean;
  /** AIの返信本文。エラー時は空文字 */
  reply: string;
  /** 応答したエージェントID（例: alpha） */
  agentId: string;
  /** 応答したエージェント名（例: Alpha） */
  agentName: string;
  /** 実際に使用したモデル名（例: gpt-4o-mini） */
  model: string;
  /** エラー文言。成功時は空文字 */
  error: string;
}

// --- 段階B: 複数エージェントの一括応答 ---------------------------------------
// 1リクエストで複数AIに順番に発言させ、まとめて返す。
// 誰が何番目に話すかの制御はサーバー側が持つため、LabVIEW 側は
// 「1回投げて ok と transcript を見る」だけで会話を成立させられる。

export interface LvMultiRequest {
  /** ユーザー（患者）の発話（必須） */
  text: string;
  /** 発言させるエージェントIDの並び。省略時は登録済みの全エージェント */
  agentIds?: string[];
  /** 同じ並びを何巡させるか。省略時は 1 */
  rounds?: number;
  /** 文脈を渡したい場合のみ。role と content だけの単純配列 */
  history?: Array<{ role: Role; content: string }>;
}

export interface LvMultiTurn {
  /** 発言順（1始まり） */
  order: number;
  /** 発言したエージェントID */
  agentId: string;
  /** 発言したエージェント名 */
  agentName: string;
  /** 実際に使用したモデル名 */
  model: string;
  /** 発言本文。失敗時は空文字 */
  reply: string;
  /** この発言単体の成否 */
  ok: boolean;
  /** この発言のエラー文言。成功時は空文字 */
  error: string;
}

export interface LvMultiResponse {
  /** 全発言が成功したときのみ true */
  ok: boolean;
  /** 発言順に並んだ各AIの応答 */
  turns: LvMultiTurn[];
  /** 全発言を1つの文字列に連結したもの。既存の表示欄にそのまま貼れる */
  transcript: string;
  /** turns の件数 */
  count: number;
  /** エラー文言。成功時は空文字 */
  error: string;
}
