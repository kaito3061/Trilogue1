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
