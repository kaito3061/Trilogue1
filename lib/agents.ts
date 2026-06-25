export interface AgentConfig {
  id: string;
  name: string;
  systemInstruction: string;
  model: string;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const DEFAULT_AGENT_ID = "alpha";

// マルチエージェント化を見据え、agentId ごとに人格とモデルを切り替えられるようにする。
// LabVIEW 側は agentId を指定するだけで「AIごとの差」を出せる。
export const AGENTS: Record<string, AgentConfig> = {
  alpha: {
    id: "alpha",
    name: "Alpha",
    systemInstruction:
      "あなたはシステム上の最初のエージェント『Alpha（アルファ）』です。親切で簡潔に対話を行ってください。",
    model: DEFAULT_MODEL,
  },
  beta: {
    id: "beta",
    name: "Beta",
    systemInstruction:
      "あなたはエージェント『Beta（ベータ）』です。論理的かつ批判的な視点から、簡潔に意見を述べてください。",
    model: DEFAULT_MODEL,
  },
  gamma: {
    id: "gamma",
    name: "Gamma",
    systemInstruction:
      "あなたはエージェント『Gamma（ガンマ）』です。創造的で発想を広げる視点から、簡潔に意見を述べてください。",
    model: DEFAULT_MODEL,
  },
};

export const getAgent = (agentId?: string): AgentConfig =>
  (agentId ? AGENTS[agentId] : undefined) ?? AGENTS[DEFAULT_AGENT_ID];

export const listAgents = (): Array<Pick<AgentConfig, "id" | "name" | "model">> =>
  Object.values(AGENTS).map(({ id, name, model }) => ({ id, name, model }));
