import { NextResponse } from "next/server";
import { LvChatRequest, LvChatResponse, Role } from "@/types/chat";
import { getAgent } from "@/lib/agents";
import { generateReply, LlmError, LlmTurn } from "@/lib/llm";
import { MAX_TEXT_LENGTH, trimHistory } from "@/lib/limits";

// LabVIEW 向けエンドポイント。
// 方針: HTTP ステータスは常に 200 を返し、成否は body.ok で判定させる。
// LabVIEW の HTTP Client VIs はステータスでの分岐が手間なため、
// 「平坦JSON + ok フラグ」に寄せることで SubVI 側の実装を最小化する。

const reply = (data: LvChatResponse) => NextResponse.json<LvChatResponse>(data);

const isTurn = (value: unknown): value is { role: Role; content: string } => {
  if (!value || typeof value !== "object") return false;
  const turn = value as { role?: unknown; content?: unknown };
  return (
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.content === "string" &&
    turn.content.trim().length > 0
  );
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<LvChatRequest>;
    const agent = getAgent(body.agentId);
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return reply({
        ok: false,
        reply: "",
        agentId: agent.id,
        agentName: agent.name,
        model: agent.model,
        error: "text は必須です。",
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return reply({
        ok: false,
        reply: "",
        agentId: agent.id,
        agentName: agent.name,
        model: agent.model,
        error: `text が長すぎます（最大 ${MAX_TEXT_LENGTH} 文字）。`,
      });
    }

    const history: LlmTurn[] = Array.isArray(body.history)
      ? body.history.filter(isTurn).map((turn) => ({ role: turn.role, content: turn.content }))
      : [];
    history.push({ role: "user", content: text });
    const trimmedHistory = trimHistory(history);

    const result = await generateReply({
      systemInstruction: agent.systemInstruction,
      model: agent.model,
      history: trimmedHistory,
    });

    return reply({
      ok: true,
      reply: result.text,
      agentId: agent.id,
      agentName: agent.name,
      model: result.model,
      error: "",
    });
  } catch (error) {
    const message =
      error instanceof LlmError ? error.message : "サーバー内部エラーが発生しました。";
    return reply({
      ok: false,
      reply: "",
      agentId: "",
      agentName: "",
      model: "",
      error: message,
    });
  }
}
