import { NextResponse } from "next/server";
import { ApiError, ChatRequest, ChatResponse, Message } from "@/types/chat";
import { getAgent } from "@/lib/agents";
import { generateReply, LlmError, LlmTurn } from "@/lib/llm";
import { MAX_TEXT_LENGTH, trimHistory } from "@/lib/limits";

const jsonError = (status: number, code: ApiError["code"], message: string) =>
  NextResponse.json<ApiError>({ code, message }, { status });

const toTurns = (messages: Message[]): LlmTurn[] =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatRequest>;
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonError(400, "INVALID_REQUEST", "messages は1件以上必要です。");
    }

    const invalidMessage = messages.some(
      (message) =>
        !message ||
        (message.role !== "user" && message.role !== "assistant") ||
        typeof message.content !== "string" ||
        message.content.trim().length === 0,
    );

    if (invalidMessage) {
      return jsonError(400, "INVALID_REQUEST", "messages の形式が不正です。");
    }

    const tooLong = messages.some((message) => message.content.length > MAX_TEXT_LENGTH);
    if (tooLong) {
      return jsonError(
        400,
        "INVALID_REQUEST",
        `メッセージが長すぎます（1件あたり最大 ${MAX_TEXT_LENGTH} 文字）。`,
      );
    }

    const agent = getAgent(body.agentId);
    const result = await generateReply({
      systemInstruction: agent.systemInstruction,
      model: agent.model,
      history: trimHistory(toTurns(messages)),
    });

    const response: ChatResponse = {
      reply: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.text,
        createdAt: new Date().toISOString(),
      },
    };

    return NextResponse.json<ChatResponse>(response);
  } catch (error) {
    if (error instanceof LlmError) {
      return jsonError(error.status, error.code, error.message);
    }
    console.error("Unexpected /api/chat error:", error);
    return jsonError(500, "INTERNAL_ERROR", "サーバー内部エラーが発生しました。");
  }
}
