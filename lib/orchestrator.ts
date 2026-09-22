import { AgentConfig, AGENTS, listAgents } from "@/lib/agents";
import { generateReply, LlmError, LlmTurn } from "@/lib/llm";
import { trimHistory } from "@/lib/limits";
import { LvMultiTurn } from "@/types/chat";

// 段階B: 「誰が何番目に話すか」の制御をサーバー側に持たせる層。
// 発言順の決定（resolveSpeakingOrder）と実行（orchestrateTurns）を分けてあり、
// 段階C では前者をファシリテーターAIの判断に差し替えられる。

/** 発言順の決め方。将来ファシリテーターAIによる動的指名を足すための境界。 */
export type TurnPolicy = "round-robin";

export interface SpeakingOrderParams {
  /** 発言させたいエージェントIDの並び。省略時は登録済み全エージェント */
  agentIds?: string[];
  /** 同じ並びを何巡させるか */
  rounds: number;
  policy?: TurnPolicy;
}

export interface SpeakingOrder {
  /** 発言順に並べたエージェント定義 */
  order: AgentConfig[];
  /** 未登録だった agentId。呼び出し側でエラーとして返す */
  unknownIds: string[];
}

/**
 * 指定された並びを rounds 回繰り返した発言順を返す。
 * 未知の agentId は既定エージェントへ丸めず unknownIds として報告する
 * （複数指定時に取り違えたまま進むと原因が分かりにくいため）。
 */
export const resolveSpeakingOrder = ({
  agentIds,
  rounds,
  policy = "round-robin",
}: SpeakingOrderParams): SpeakingOrder => {
  const requested = agentIds?.length ? agentIds : listAgents().map((agent) => agent.id);
  const unknownIds = requested.filter((id) => !AGENTS[id]);
  if (unknownIds.length > 0) {
    return { order: [], unknownIds };
  }

  const lineup = requested.map((id) => AGENTS[id]);
  const order =
    policy === "round-robin"
      ? Array.from({ length: rounds }, () => lineup).flat()
      : lineup;

  return { order, unknownIds: [] };
};

/** 会話ログ上で発言者を示す接頭辞。他エージェントが読んだときに区別できるようにする。 */
const speakerLabel = (agent: AgentConfig) => `【${agent.name}】`;

// 各エージェントには「これは複数AIが順番に話す場である」ことを伝える。
// これがないと他AIの発言を自分の発言と混同したり、同じ内容を繰り返しやすい。
const buildSystemInstruction = (agent: AgentConfig, order: AgentConfig[]): string => {
  const others = [...new Set(order.filter((a) => a.id !== agent.id).map((a) => a.name))];
  const roster = others.length > 0 ? `同席しているのは ${others.join(" / ")} です。` : "";
  return [
    agent.systemInstruction,
    `これは複数のAIが順番に発言する会話の場です。${roster}`,
    "他のAIの発言は先頭に【名前】が付いています。既出の意見をそのまま繰り返さず、必要なら簡潔に触れたうえで自分の視点を述べてください。",
    "自分の発言に【名前】を付ける必要はありません。",
  ].join("\n");
};

// 発言ごとの進捗を1行ずつ出す。サーバーが順番に呼び出していることを
// ログ側から追えるようにするため（動作確認と実演で経過が見えないと判断できない）。
const logTurn = (position: number, total: number, agent: AgentConfig, suffix: string) =>
  console.log(`[multi] ${position}/${total} ${agent.name} ${suffix}`);

export interface OrchestrateParams {
  /** ユーザー（患者）の発話 */
  text: string;
  /** resolveSpeakingOrder で決めた発言順 */
  order: AgentConfig[];
  /** LV から渡された既存の文脈 */
  history: LlmTurn[];
}

/**
 * 発言順に沿って各エージェントを1体ずつ呼び出す。
 * 直前までの発言を文脈として渡すため、単発の並列回答ではなく
 * 互いの発言を読み合う会話になる。
 * 途中で失敗した発言は ok:false として記録し、残りの発言は続行する
 * （1体の失敗で会話全体を捨てるより、取れた発言を返した方がLV側で扱いやすい）。
 */
export async function orchestrateTurns({
  text,
  order,
  history,
}: OrchestrateParams): Promise<LvMultiTurn[]> {
  const context: LlmTurn[] = [...history, { role: "user", content: text }];
  const turns: LvMultiTurn[] = [];

  for (const [index, agent] of order.entries()) {
    const position = index + 1;
    const startedAt = Date.now();
    logTurn(position, order.length, agent, "へ問い合わせ");

    try {
      const result = await generateReply({
        systemInstruction: buildSystemInstruction(agent, order),
        model: agent.model,
        history: trimHistory(context),
      });

      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      logTurn(position, order.length, agent, `完了 (${elapsed}秒 / ${result.text.length}文字)`);

      turns.push({
        order: position,
        agentId: agent.id,
        agentName: agent.name,
        model: result.model,
        reply: result.text,
        ok: true,
        error: "",
      });
      context.push({
        role: "assistant",
        content: `${speakerLabel(agent)} ${result.text}`,
      });
    } catch (error) {
      const message =
        error instanceof LlmError
          ? error.message
          : "エージェントの呼び出しに失敗しました。";
      logTurn(position, order.length, agent, `失敗: ${message}`);

      turns.push({
        order: position,
        agentId: agent.id,
        agentName: agent.name,
        model: agent.model,
        reply: "",
        ok: false,
        error: message,
      });
    }
  }

  return turns;
}

/** 全発言を1つの文字列に連結する。LV は既存の表示欄にそのまま貼れる。 */
export const buildTranscript = (turns: LvMultiTurn[]): string =>
  turns
    .map((turn) => `${turn.agentName}: ${turn.ok ? turn.reply : `(エラー: ${turn.error})`}`)
    .join("\n\n");
