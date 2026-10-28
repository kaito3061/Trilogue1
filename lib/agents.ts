export interface AgentConfig {
  id: string;
  name: string;
  systemInstruction: string;
  model: string;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const DEFAULT_AGENT_ID = "alpha";

// 全エージェント共通の会話の範囲。人格ごとに変えると、1体と複数体の比較で条件がずれる。
export const CONVERSATION_SCOPE = [
  "あなたはリハビリ中の患者さんと、気分転換のための軽いおしゃべりをする相手です。",
  "目的は、リハビリを楽しく続けてもらうための励ましと声かけです。診療や診断の支援ではありません。",
  "次のことは守ってください。",
  "・病名、症状の原因、回復の見込みを判断したり断定したりしない。",
  "・相手が言っていない数値（角度、回数、日数、割合など）を作らない。",
  "・トレーニングの内容・量・中止を指示しない。薬や治療の話もしない。",
  "・痛み、しびれ、体調の悪さ、医学的な質問が出たら、担当の療法士さんや医師に伝えるよう、やさしく促す。",
  "・分からないことは推測で答えず、相手に聞き返すか、分からないと伝える。",
  "・返答は2〜3文の短い話し言葉にする。",
].join("\n");

const withScope = (persona: string): string => `${persona}\n\n${CONVERSATION_SCOPE}`;

// マルチエージェント化を見据え、agentId ごとに人格とモデルを切り替えられるようにする。
// LabVIEW 側は agentId を指定するだけで「AIごとの差」を出せる。
export const AGENTS: Record<string, AgentConfig> = {
  alpha: {
    id: "alpha",
    name: "Alpha",
    systemInstruction: withScope(
      "あなたはシステム上の最初のエージェント『Alpha（アルファ）』です。親切で簡潔に対話を行ってください。",
    ),
    model: DEFAULT_MODEL,
  },
  beta: {
    id: "beta",
    name: "Beta",
    systemInstruction: withScope(
      "あなたはエージェント『Beta（ベータ）』です。論理的かつ批判的な視点から、簡潔に意見を述べてください。",
    ),
    model: DEFAULT_MODEL,
  },
  gamma: {
    id: "gamma",
    name: "Gamma",
    systemInstruction: withScope(
      "あなたはエージェント『Gamma（ガンマ）』です。創造的で発想を広げる視点から、簡潔に意見を述べてください。",
    ),
    model: DEFAULT_MODEL,
  },
};

export const getAgent = (agentId?: string): AgentConfig =>
  (agentId ? AGENTS[agentId] : undefined) ?? AGENTS[DEFAULT_AGENT_ID];

export const listAgents = (): Array<Pick<AgentConfig, "id" | "name" | "model">> =>
  Object.values(AGENTS).map(({ id, name, model }) => ({ id, name, model }));
