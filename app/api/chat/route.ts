import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ApiError, ChatRequest, ChatResponse, Message } from "@/types/chat";

const SYSTEM_INSTRUCTION =
  "あなたはシステム上の最初のエージェント『Alpha（アルファ）』です。親切で簡潔に対話を行ってください。";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const jsonError = (status: number, code: ApiError["code"], message: string) =>
  NextResponse.json<ApiError>({ code, message }, { status });

const toOpenAIMessages = (messages: Message[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  })) as Array<{ role: "user" | "assistant"; content: string }>;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonError(500, "INTERNAL_ERROR", "OPENAI_API_KEY が設定されていません。");
  }

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

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        ...toOpenAIMessages(messages),
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();

    if (!text) {
      return jsonError(502, "UPSTREAM_ERROR", "OpenAI API の応答が空でした。");
    }

    const response: ChatResponse = {
      reply: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        createdAt: new Date().toISOString(),
      },
    };

    return NextResponse.json<ChatResponse>(response);
  } catch (error) {
    console.error("OpenAI API error:", error);
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      return jsonError(429, "RATE_LIMIT", "OpenAI API の利用上限に達しました。時間を置いて再試行してください。");
    }
    return jsonError(502, "UPSTREAM_ERROR", "OpenAI API の呼び出しに失敗しました。");
  }
}
