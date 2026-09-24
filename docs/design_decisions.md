# 設計で自分で決めたところ

先生から聞かれた論点への短い答え。
詳細な経緯は `docs/architecture_decision_records.md` にある。

枠組み（Next.js、Docker、LabVIEW の HTTP Client / JSON VIs、OpenAI API）は既存である。
**LabVIEW 側に会話ロジックを置かないこと、平坦JSONと `ok` フラグ、Orchestrator の分離、
人格とモデルを別フィールドにすること、途中失敗しても会話を返すこと**は、
この研究室の制約（LabVIEW が窓口、画面を二重に作りたくない）から自分で決めた。
論文からの転記ではない。使った公式の挙動は下に書いた。

---

## なぜ LabVIEW に会話ロジックを置かなかったか

LabVIEW は計測画面の窓口にしたい。会話の順番や再試行まで VI に書くと、
AI を増やすたびにブロックダイアグラムが膨らみ、他の学生が触れなくなる。

サーバーに置けば、LabVIEW は「文字列を1回送る」だけで済む。
画面の変更は LabVIEW 側だけで完結し、会話の組み替えはサーバー側だけで済む。

検討してやめた案: LabVIEW から LLM を直接叩く（APIキーが VI に残る）、
発言ごとに VI から1体ずつ呼ぶ（段階A。動くが、会話が増えるほど VI が複雑になる）。

対応: ADR-003、ADR-014。

---

## なぜ Orchestrator を分離したか

「誰が次に話すか」と「実際に呼ぶ」を同じ関数に書くと、司会AIを入れるときに
呼び出し側まで書き換えることになる。

いまは `resolveSpeakingOrder` が順番を決め、`orchestrateTurns` が実行する
（`lib/orchestrator.ts`）。司会AIを入れるときは、決める側だけを差し替える。

これはソフトウェアでよく使う「方針と実行の分離」である。
マルチエージェントの論文をそのまま実装したわけではない。
段階C（司会AI）を最初から見据えて、自分で境界を切った。

対応: ADR-015。

---

## なぜ JSON を単純化したか

LabVIEW の `Flatten To JSON` / `Unflatten From JSON` は、
**クラスタのラベル名がそのまま JSON のキーになる**
（NI のヘルプ: [Flatten To JSON](https://www.ni.com/docs/ja-JP/bundle/labview-api-ref/page/functions/flatten-to-json.html)）。
入れ子や配列の解析は、VI 側の部品が増える。

そのため LabVIEW 向けAPIは次の3点に決めた。

- 入れ子にしない
- HTTPステータスは常に 200。成否は本文の `ok`
- 複数AIの会話は、配列に加えて連結済みの `transcript` も返す

`ok` で成否を表すのは REST の教科書どおりではない。
LabVIEW の HTTP Client でステータスコード分岐を増やしたくない、という理由で
**LabVIEW 向けエンドポイントに限って**そうしている。Web 用 `/api/chat` には適用しない。

対応: ADR-004、ADR-005。

---

## persona と model を分けた理由

比較したいのは次の2つで、性質が違う。

- 同じモデルに役割（ペルソナ）だけを変える … 条件B
- モデルそのものを変える … 条件C

1つの文字列に混ぜると、条件を切り替えるときにコードを触ることになる。
`lib/agents.ts` では `systemInstruction` と `model` を別フィールドにした。
LabVIEW 側は `agentId` を変えるだけでよい。

条件Bがいまの実装（3体とも `gpt-4o-mini`、人格だけ違う）。
条件Cは、各エージェントの `model` を書き換えるだけで移行できる。

対応: ADR-008。

---

## Agent が途中で失敗するとどうなるか

1体の失敗で会話全体を捨てない。失敗した発言は `ok: false` と `error` を残し、
残りは続行する。`transcript` には `(エラー: …)` と入る。
HTTP は 200 のまま。全体の `ok` は、1件でも失敗があれば `false`。

理由は、LabVIEW 側で「何も返ってこない」より「取れた発言と、どこが落ちたか」が
見えた方が次の手を打ちやすいからである。
分散システムでいう部分成功に近いが、特定の論文の手順ではない。

タイムアウトは LLM 呼び出し 60 秒（`lib/limits.ts`）。
上限を超えた入力は、呼ぶ前にエラーを返す。

対応: ADR-018、ADR-010。

---

## 次に司会AIを入れるなら、どこを変更するか

触るのは `lib/orchestrator.ts` の `resolveSpeakingOrder` だけ、が目標である。
`orchestrateTurns`、LabVIEW の VI、JSON の形は変えない。

いまの `TurnPolicy` は `"round-robin"` だけである。
ここに「直前の文脈を司会AIに渡し、次の `agentId` を返してもらう」方針を足す。

LabVIEW から見える約束（1回投げて `transcript` が返る）は維持する。

---

## A〜D を比較するなら、何を評価指標にするか

まだ測っていない。測るなら次の3つを先に置く。

| 指標 | 見ること | 取り方の案 |
| --- | --- | --- |
| 多面性 | 同じ内容の繰り返しが減るか、視点が分かれるか | 発言間の重複（語句の重なり）と、人手での観点ラベル |
| 効率 | 応答時間と発言数のつり合い | すでに取っている秒数（3体で約6.0秒、うちサーバー7ms） |
| 負担 | 患者役が読む量・待つ時間 | 総文字数、総秒数、途中で打ち切りたくなる長さか |

「3体が最適」は主張しない。上の指標で A〜D を並べ、主観情報を引き出せる構造を見る。

---

## 参考にした公式（転記ではなく、挙動の確認）

| 対象 | 何を確認したか |
| --- | --- |
| NI LabVIEW, Flatten To JSON / Unflatten From JSON | クラスタラベルが JSON キーになる |
| NI LabVIEW, HTTP Client VIs | POST とタイムアウトの扱い |
| Docker Compose, `env_file` | キーをイメージに焼き込まず起動時に渡す |
| Next.js App Router, Route Handlers | `/api/lv/*` の置き場所 |
| OpenAI API, Chat Completions | サーバーから LLM を呼ぶ |

既製の LLM 製品（Dify / Flowise / LiteLLM / Open WebUI など）は使っていない。
会話制御と LabVIEW 向けの契約は自作である。
