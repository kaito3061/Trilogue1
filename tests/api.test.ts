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
import { POST as lvMultiPost } from "@/app/api/lv/multi/route";
import { generateReply, LlmError } from "@/lib/llm";
import { MAX_TURNS_PER_REQUEST } from "@/lib/limits";

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

describe("POST /api/lv/multi", () => {
  it("指定した順番どおりに各エージェントが発言する", async () => {
    const res = await lvMultiPost(jsonRequest({ text: "感想です", agentIds: ["alpha", "beta"] }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(2);
    expect(body.turns.map((turn: { agentId: string }) => turn.agentId)).toEqual(["alpha", "beta"]);
    expect(body.turns.map((turn: { order: number }) => turn.order)).toEqual([1, 2]);
    expect(body.transcript).toContain("Alpha:");
    expect(body.transcript).toContain("Beta:");
    expect(generateReply).toHaveBeenCalledTimes(2);
  });

  it("後続のエージェントは直前の発言を文脈として受け取る", async () => {
    await lvMultiPost(jsonRequest({ text: "感想です", agentIds: ["alpha", "beta"] }));

    const secondCall = vi.mocked(generateReply).mock.calls[1][0];
    const contents = secondCall.history.map((turn) => turn.content);
    expect(contents).toContain("感想です");
    // Alpha の発言が【名前】付きで積まれている（＝読み合う会話になっている）。
    expect(contents.some((content) => content.startsWith("【Alpha】"))).toBe(true);
  });

  it("rounds を指定すると同じ並びを繰り返す", async () => {
    const res = await lvMultiPost(
      jsonRequest({ text: "感想です", agentIds: ["alpha", "beta"], rounds: 2 }),
    );

    const body = await res.json();
    expect(body.count).toBe(4);
    expect(body.turns.map((turn: { agentId: string }) => turn.agentId)).toEqual([
      "alpha",
      "beta",
      "alpha",
      "beta",
    ]);
  });

  it("未登録の agentId は ok:false で理由を返す", async () => {
    const res = await lvMultiPost(jsonRequest({ text: "感想です", agentIds: ["unknown"] }));

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("unknown");
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("総発言数が上限を超えたら LLM を呼ばずに拒否する", async () => {
    const res = await lvMultiPost(
      jsonRequest({ text: "感想です", agentIds: ["alpha", "beta", "gamma"], rounds: 3 }),
    );

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain(String(MAX_TURNS_PER_REQUEST));
    expect(generateReply).not.toHaveBeenCalled();
  });

  it("1体が失敗しても残りの発言は続行する", async () => {
    vi.mocked(generateReply).mockRejectedValueOnce(
      new LlmError("UPSTREAM_ERROR", 502, "LLM の呼び出しに失敗しました。"),
    );

    const res = await lvMultiPost(jsonRequest({ text: "感想です", agentIds: ["alpha", "beta"] }));

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.count).toBe(2);
    expect(body.turns[0].ok).toBe(false);
    expect(body.turns[0].error).toBeTruthy();
    expect(body.turns[1].ok).toBe(true);
    expect(body.turns[1].reply).toBe("mocked reply");
  });
});
