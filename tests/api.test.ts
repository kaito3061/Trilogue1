import { describe, it, expect, vi, beforeEach } from "vitest";

// LLM呼び出しはモックし、外部通信を一切行わない。
// （対象の検証パスはLLM到達前に短絡するが、安全のため明示的にモックする）
vi.mock("@/lib/llm", () => {
  class LlmError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    LlmError,
    generateReply: vi.fn(async () => ({ text: "mocked reply", model: "gpt-4o-mini" })),
  };
});

import { POST as chatPost } from "@/app/api/chat/route";
import { POST as lvChatPost } from "@/app/api/lv/chat/route";
import { generateReply } from "@/lib/llm";

const jsonRequest = (body: unknown) =>
  new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chat", () => {
  it("messages が空なら 400 / INVALID_REQUEST を返す", async () => {
    const res = await chatPost(jsonRequest({ messages: [] }));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe("INVALID_REQUEST");
    // バリデーションで短絡するため、LLMは呼ばれない。
    expect(generateReply).not.toHaveBeenCalled();
  });
});

describe("POST /api/lv/chat", () => {
  it("text が空なら ok:false かつ error が入る（ステータスは200）", async () => {
    const res = await lvChatPost(jsonRequest({ text: "" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBeTruthy();
    expect(generateReply).not.toHaveBeenCalled();
  });
});
