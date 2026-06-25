import OpenAI from "openai";
import { LLM_TIMEOUT_MS } from "@/lib/limits";

export type LlmErrorCode = "RATE_LIMIT" | "UPSTREAM_ERROR" | "INTERNAL_ERROR";

export interface LlmTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LlmResult {
  text: string;
  model: string;
}

export interface GenerateParams {
  systemInstruction: string;
  model: string;
  history: LlmTurn[];
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

// プロバイダ抽象。将来 Gemini 等を差し替えやすくするための境界。
// 実装側は成功時 LlmResult を返し、失敗時 LlmError を投げる契約とする。
export interface LlmProvider {
  generate(params: GenerateParams): Promise<LlmResult>;
}

export class OpenAiProvider implements LlmProvider {
  async generate(params: GenerateParams): Promise<LlmResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new LlmError("INTERNAL_ERROR", 500, "OPENAI_API_KEY が設定されていません。");
    }

    try {
      const client = new OpenAI({ apiKey, timeout: LLM_TIMEOUT_MS });
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
      // タイムアウト・接続失敗などはすべて UPSTREAM_ERROR に正規化する。
      throw new LlmError("UPSTREAM_ERROR", 502, "LLM の呼び出しに失敗しました。");
    }
  }
}

const defaultProvider: LlmProvider = new OpenAiProvider();

// 既存の呼び出し側（routes）の契約は変えず、内部でプロバイダ経由に委譲する。
export async function generateReply(
  params: GenerateParams,
  provider: LlmProvider = defaultProvider,
): Promise<LlmResult> {
  return provider.generate(params);
}
