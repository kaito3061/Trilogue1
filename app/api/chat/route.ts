import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { ApiError, ChatRequest, ChatResponse, Message } from "@/types/chat";

type GeminiRole = "user" | "model";

interface GeminiContent {
  role: GeminiRole;
  parts: Array<{ text: string }>;
}

const SYSTEM_INSTRUCTION =
  "あなたはシステム上の最初のエージェント『Alpha（アルファ）』です。親切で簡潔に対話を行ってください。";

const toGeminiContents = (messages: Message[]): GeminiContent[] =>
  messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

const jsonError = (status: number, code: ApiError["code"], message: string) =>
  NextResponse.json<ApiError>({ code, message }, { status });

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError(500, "INTERNAL_ERROR", "GEMINI_API_KEY が設定されていません。");
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const contents = toGeminiContents(messages);
    const result = await model.generateContent({ contents });
    const text = result.response.text().trim();

    if (!text) {
      return jsonError(502, "UPSTREAM_ERROR", "AI応答が空でした。");
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
    console.error("Gemini API error:", error);
    return jsonError(502, "UPSTREAM_ERROR", "Gemini API の呼び出しに失敗しました。");
  }
}
