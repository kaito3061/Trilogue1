import OpenAI from "openai";

export type LlmErrorCode = "RATE_LIMIT" | "UPSTREAM_ERROR" | "INTERNAL_ERROR";

export interface LlmTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LlmResult {
  text: string;
  model: string;
}

// LLM 呼び出し境界で発生するエラーを HTTP ステータスとコードに正規化する。
// これにより /api/chat（Web）も /api/lv/chat（LabVIEW）も同じ分類を共有できる。
export class LlmError extends Error {
  code: LlmErrorCode;
  status: number;

  constructor(code: LlmErrorCode, status: number, message: string) {
    super(message);
    this.name = "LlmError";
    this.code = code;
    this.status = status;
  }
}

export async function generateReply(params: {
  systemInstruction: string;
  model: string;
  history: LlmTurn[];
}): Promise<LlmResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LlmError("INTERNAL_ERROR", 500, "OPENAI_API_KEY が設定されていません。");
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.systemInstruction },
        ...params.history,
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new LlmError("UPSTREAM_ERROR", 502, "LLM の応答が空でした。");
    }

    return { text, model: params.model };
  } catch (error) {
    if (error instanceof LlmError) {
      throw error;
    }
    console.error("LLM error:", error);
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      throw new LlmError(
        "RATE_LIMIT",
        429,
        "LLM の利用上限に達しました。時間を置いて再試行してください。",
      );
    }
    throw new LlmError("UPSTREAM_ERROR", 502, "LLM の呼び出しに失敗しました。");
  }
}
