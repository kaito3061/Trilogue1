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
