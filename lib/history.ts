import { Role } from "@/types/chat";
import { LlmTurn } from "@/lib/llm";

// LabVIEW 向けエンドポイント間で共通の history 解析。
// LV から届く配列は型保証がないため、role/content として使える要素だけを残す。

const isTurn = (value: unknown): value is { role: Role; content: string } => {
  if (!value || typeof value !== "object") return false;
  const turn = value as { role?: unknown; content?: unknown };
  return (
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.content === "string" &&
    turn.content.trim().length > 0
  );
};

/** 不正な要素を捨てて LlmTurn の配列に整える。history が無い場合は空配列。 */
export const parseHistory = (value: unknown): LlmTurn[] =>
  Array.isArray(value)
    ? value.filter(isTurn).map((turn) => ({ role: turn.role, content: turn.content }))
    : [];
