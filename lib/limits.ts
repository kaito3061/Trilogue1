// API共通の制限値。Web用(/api/chat)とLabVIEW用(/api/lv/chat)で共有する。

/** LLMへ送る会話履歴の最大件数（直近この件数だけを送り、超過分は切り詰める）。 */
export const MAX_HISTORY_MESSAGES = 20;

/** 1発話(text/content)の最大文字数。超過時は各エンドポイントの流儀でエラーを返す。 */
export const MAX_TEXT_LENGTH = 8000;

/** LLM呼び出しのタイムアウト(ミリ秒)。 */
export const LLM_TIMEOUT_MS = 60_000;

// 段階B(/api/lv/multi)の上限。1発言=1回のLLM呼び出しになるため、
// 応答時間と利用料が膨らまないよう発言数そのものに上限を設ける。

/** 1リクエストで指定できるエージェント数の上限。 */
export const MAX_AGENTS_PER_REQUEST = 5;

/** 同じ発言順を繰り返せる巡回数の上限。 */
export const MAX_ROUNDS = 3;

/** 1リクエストで実行できる総発言数（エージェント数 × 巡回数）の上限。 */
export const MAX_TURNS_PER_REQUEST = 6;

/** 直近 max 件だけを残して古い履歴を切り詰める。 */
export const trimHistory = <T>(turns: T[], max: number = MAX_HISTORY_MESSAGES): T[] =>
  turns.length > max ? turns.slice(turns.length - max) : turns;
