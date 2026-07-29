import { NextResponse } from "next/server";
import { LvMultiRequest, LvMultiResponse } from "@/types/chat";
import { listAgents } from "@/lib/agents";
import { parseHistory } from "@/lib/history";
import {
  MAX_AGENTS_PER_REQUEST,
  MAX_ROUNDS,
  MAX_TEXT_LENGTH,
  MAX_TURNS_PER_REQUEST,
} from "@/lib/limits";
import { buildTranscript, orchestrateTurns, resolveSpeakingOrder } from "@/lib/orchestrator";

// 段階B: 複数エージェントの応答を1リクエストでまとめて返す LabVIEW 向けエンドポイント。
// /api/lv/chat と同じ流儀で、HTTP ステータスは常に 200・成否は body.ok で判定させる。
// LV 側は「1回投げて ok と transcript を見る」だけで会話が成立し、
// 各発言を個別に扱いたい場合のみ turns[] を解析すればよい。

const reply = (data: LvMultiResponse) => NextResponse.json<LvMultiResponse>(data);

const failure = (error: string) =>
  reply({ ok: false, turns: [], transcript: "", count: 0, error });

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<LvMultiRequest>;
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return failure("text は必須です。");
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return failure(`text が長すぎます（最大 ${MAX_TEXT_LENGTH} 文字）。`);
    }

    if (body.agentIds !== undefined) {
      if (!Array.isArray(body.agentIds) || body.agentIds.some((id) => typeof id !== "string")) {
        return failure("agentIds は文字列の配列で指定してください。");
      }
      if (body.agentIds.length > MAX_AGENTS_PER_REQUEST) {
        return failure(`agentIds が多すぎます（最大 ${MAX_AGENTS_PER_REQUEST} 体）。`);
      }
    }

    const rounds = body.rounds ?? 1;
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ROUNDS) {
      return failure(`rounds は 1〜${MAX_ROUNDS} の整数で指定してください。`);
    }

    const { order, unknownIds } = resolveSpeakingOrder({ agentIds: body.agentIds, rounds });
    if (unknownIds.length > 0) {
      const available = listAgents()
        .map((agent) => agent.id)
        .join(" / ");
      return failure(`未登録の agentId です: ${unknownIds.join(", ")}（指定可能: ${available}）`);
    }

    if (order.length > MAX_TURNS_PER_REQUEST) {
      return failure(
        `発言数が多すぎます（エージェント数 × rounds は最大 ${MAX_TURNS_PER_REQUEST}）。`,
      );
    }

    const turns = await orchestrateTurns({
      text,
      order,
      history: parseHistory(body.history),
    });

    const failed = turns.filter((turn) => !turn.ok);

    return reply({
      ok: failed.length === 0,
      turns,
      transcript: buildTranscript(turns),
      count: turns.length,
      error:
        failed.length === 0
          ? ""
          : `${failed.length}件の発言が失敗しました: ${failed[0].error}`,
    });
  } catch {
    return failure("サーバー内部エラーが発生しました。");
  }
}
