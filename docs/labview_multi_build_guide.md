# Trilogue Multi Chat.vi 組み立てガイド（クリック単位）

LabVIEW を開きながら**上から順になぞれば** `Trilogue Multi Chat.vi` が完成する手順書。
対象: `POST /api/lv/multi` を**1回**叩いて、**複数AIの発言をまとめて**受け取る VI（段階B）。

> 前提1: `Trilogue Chat.vi`（単体AI版）が完成していること。本ガイドは**それを複製して改造**する。
> 前提2: 先に `python3 scripts/lv_roundtrip_check.py` が **ALL PASS** していること。
> 　　　（`[4] POST /api/lv/multi` の行まで PASS していれば、あとはLVで同じPOSTを組むだけ）

凡例: `▶パレット > サブ > VI名` = ブロック図で右クリック→そのパスのVIを選んで配置。

---

## 0. 単体AI版との違い（作業前に把握する）

| 項目 | `Trilogue Chat.vi`（既存） | `Trilogue Multi Chat.vi`（今回） |
| --- | --- | --- |
| URL | `/api/lv/chat` | **`/api/lv/multi`** |
| 送るもの | `text` + `agentId`（1体を指名） | `text` のみでも動く（**省略時は全AIが1巡発言**） |
| 返るもの | `reply`（1体の返信） | **`transcript`**（全発言を連結した1本の文字列） |
| 待ち時間 | 1〜3秒 | **AIの数に比例（3体で約6秒）** ← タイムアウト注意 |
| LV側の解析 | クラスタ6要素 | **クラスタ3要素でよい**（`ok` / `transcript` / `error`） |

> **設計の意図**：サーバーが全発言を `transcript` という1本の文字列に連結して返すため、
> LV 側は**配列を解析しなくても会話を表示できる**。単体AI版の `Reply` 表示欄を
> そのまま流用できる、というのが今回の作りの狙い。

---

## STEP 0. 既存VIを複製する

1. `Trilogue Chat.vi` を開く。
2. `File > Save As...` → **`Copy > Substitute copy for original`** を選び、
   ファイル名を **`Trilogue Multi Chat.vi`** にして保存。
   - ⚠ `Save As` で「Rename」を選ぶと元のVIが無くなる。**必ず Copy 系**を選ぶ。
3. これで単体AI版を壊さずに改造できる。以降はこの複製側で作業する。

---

## STEP 1. フロントパネルの表示器を差し替える

`Ctrl+E` でフロントパネルへ。

1. `Reply` 表示器のラベルを **`Transcript`** に変更（ラベルをダブルクリックして書き換え）。
2. `Transcript` の**高さを大きく広げる**（3体分＝十数行が入る想定）。
3. `Transcript` を右クリック → `Visible Items > Vertical Scrollbar` を有効化。
4. `Agent ID` はもう使わないが、**消さずに残しておいてよい**（STEP2で配線を外すだけ）。
   - 消す場合はブロック図側の配線も消す必要があるため、残す方が安全。

> `Transcript` には `Alpha: ...`（空行）`Beta: ...` の形で入る。
> 表示は **`Normal Display`** のままでよい（改行がそのまま反映される）。

---

## STEP 2. リクエストを `text` だけにする

`Ctrl+E` でブロック図へ。既存の送信部分（Cluster Constant → Bundle By Name）を直す。

1. Cluster Constant の中の **`agentId`**（String Constant）を選んで **Delete**。
   - 残るのは `text` の1個だけ。
2. `Bundle By Name` の名前欄が `text` だけになる（`Agent ID` からの配線は自動で切れる。
   切れ端が残っていたら `Ctrl+B` で不良配線を一括削除）。
3. `User Text` → `Bundle By Name` の `text` 入力、の配線はそのまま活かす。

これで送信JSONは `{"text":"..."}` になり、**サーバー側が登録済みの全AI（Alpha/Beta/Gamma）を
1巡させる**。LV側の作業はこれで済む。

### （任意）発言させるAIを指定したい場合
全AIではなく「Alpha と Beta だけ」に絞りたいときだけ、以下を追加する。

1. フロントパネルに `▶Modern > Array, Matrix & Cluster > Array` を配置し、ラベルを `Agent IDs` に。
2. その**枠の中**に `String Control` をドラッグして入れる（＝文字列配列になる）。
3. 配列の要素0に `alpha`、要素1に `beta` を入力し、
   右クリック → `Data Operations > Make Current Value Default`。
4. ブロック図で、Cluster Constant の中に `▶Programming > Array > Array Constant` を入れ、
   その中に `String Constant` を1個入れる。**Array Constant のラベルを `agentIds`** にする。
5. `Bundle By Name` の名前欄を伸ばして `agentIds` を表示し、`Agent IDs`（パネル）を配線。

> ⚠ `rounds`（何巡させるか）は**付けないのが無難**。付けると既定値 0 が送られて
> 「rounds は 1〜3 の整数で」というエラーになる。省略すれば自動的に1巡。

---

## STEP 3. URL を `/api/lv/multi` に変える

1. STEP4相当の `Concatenate Strings` に繋がっている String Constant を探す。
2. 中身を `/api/lv/chat` → **`/api/lv/multi`** に書き換える。
   - ⚠ スペル注意。`multi` は末尾スラッシュなし。

---

## STEP 4. 【最重要】タイムアウトを伸ばす

複数AIを順番に呼ぶため、**AIの数に比例して待ち時間が伸びる**（実測：3体で約6.3秒）。
LabVIEW の `POST` は**既定 10 秒**でタイムアウトするため、そのままでは
AIの返事が長いときに失敗する。

1. ブロック図の **`POST`** ノードを探す。
2. `timeout (ms)` 入力端子（既定 `10000`）を見つける。
   - 端子が見えない場合は、ノードにカーソルを合わせて端子ラベルを表示させるか、
     ノードを縦に少し広げる。
3. `▶Programming > Numeric > Numeric Constant` を配置し、値を **`120000`**（2分）にする。
4. その定数を `POST` の `timeout (ms)` へ配線。

> これを忘れると「途中までは動くのに、AIが長く喋った時だけエラー」という
> 再現しにくい不具合になる。**最初に必ず設定する。**

---

## STEP 5. 応答クラスタを3要素に差し替える

1. 受信用のクラスタ定数（`Unflatten From JSON` の `type` に入れているひな型）を開く。
2. 中の要素を**以下の3つだけ**にする（他は Delete）。

| 順 | 部品 | ラベル |
| --- | --- | --- |
| 1 | False Constant（`▶Programming > Boolean > False Constant`） | `ok` |
| 2 | String Constant | `transcript` |
| 3 | String Constant | `error` |

   - ⚠ ラベルは応答キーと**完全一致**（`ok` / `transcript` / `error`）。
   - 既存の `reply` を `transcript` に**書き換えるだけ**でもよい。残りの
     `agentId` / `agentName` / `model` は削除する。

3. `Unflatten From JSON` の **`strict validation?`** は **False（既定のまま）** にしておく。
   - サーバーは `turns` や `count` も返すが、非strictならクラスタに無いキーは**無視される**。
     つまり3要素だけ拾えば動く。ここが「LV側の実装を増やさない」肝。

---

## STEP 6. 表示の配線を直す

1. `Unbundle By Name` の名前欄が `ok` / `transcript` / `error` の3つになる。
2. 配線:
   - `ok` → **`OK?`**（LED）
   - `transcript` → **`Transcript`**（表示器）
   - `error` → **`Error Msg`**
3. `Case Structure` で分岐させている場合:
   - **True** ケース: `transcript` を `Transcript` へ。
   - **False** ケース: `error` を `Transcript` へ。
   - ⚠ **出力トンネルは1つだけ**にし、True/False の両方から**同じトンネル**へ配線する
     （別々に作ると配線が壊れる。単体AI版で一度つまずいた箇所）。
4. `Ctrl+B` で不良配線を掃除し、`Ctrl+Shift+E`（またはツールバーの矢印）で
   実行可能になっているか確認。

---

## STEP 7. 実行テスト

1. サーバー起動（同一PCなら `npm run dev`、別PCなら `npm run dev:lan`）。
2. `Base URL` が正しいか確認（同一PC: `http://localhost:3000` / 別PC: `http://<サーバーIP>:3000`）。
3. `User Text` に、患者の感想を模した文章を入力。例:

   ```
   リハビリのトレーニングを終えました。指が少し動きやすくなった気がして、続けられそうです。
   ```

4. ▶ **Run** をクリック。**数秒待つ**（3体なら約6秒）。
5. 期待結果: `OK?` が点灯し、`Transcript` に次の形で3体の発言が並ぶ。

   ```
   Alpha: それは素晴らしいですね！リハビリは根気が必要ですが…

   Beta: リハビリの過程で感じられる小さな前進は非常に重要です…

   Gamma: 進捗を感じられることは大きなモチベーションになりますね…
   ```

> **確認ポイント**：Beta や Gamma が Alpha と**同じ内容を繰り返していない**こと。
> 各AIには直前までの発言が文脈として渡っているため、
> 「並列に3つ答えた」ではなく「**読み合って会話している**」状態になる。

---

## STEP 8.（任意）1発言ずつ扱いたい場合

`transcript` の1本表示で足りるならこの STEP は不要。
「AIごとに色を変える」「発言を表に並べる」等をやりたい場合のみ。

1. 受信用クラスタ定数に、`▶Programming > Array > Array Constant` を追加し、ラベルを `turns` に。
2. その `Array Constant` の中に **`Cluster Constant`** を入れ、さらにその中へ以下を配置。

| 順 | 部品 | ラベル |
| --- | --- | --- |
| 1 | Numeric Constant（右クリック → `Representation > I32`） | `order` |
| 2 | String Constant | `agentId` |
| 3 | String Constant | `agentName` |
| 4 | String Constant | `model` |
| 5 | String Constant | `reply` |
| 6 | False Constant | `ok` |
| 7 | String Constant | `error` |

3. `Unbundle By Name` に `turns` が出るので、`▶Programming > Structures > For Loop` に
   通し（自動指標付け）、`Unbundle By Name` で `agentName` と `reply` を取り出して
   好きな形式で表示する。

> `turns[i].ok` は**その発言単体の成否**。1体が失敗しても残りの発言は返るため、
> 失敗した発言だけを赤字にする等の作り込みができる。

---

## SubVI 化（再利用のため）

> 注意: コネクタペーンは**フロントパネル側**にしかない。ブロック図右上のアイコンを
> 右クリックしても `Show Connector` は出ない。必ず `Ctrl+E` でフロントパネルへ。

1. フロントパネルへ切り替え、右上の**アイコン**を右クリック → **`Show Connector`**。
2. 格子を右クリック → `Patterns` で端子数を選ぶ（下記6個なら 4-4 等）。
3. 端子割り当て:
   - 入力: `Base URL`, `User Text`, `error in`（＋任意で `Agent IDs`）
   - 出力: `Transcript`, `OK?`, `Error Msg`, `error out`
4. 保存名 `Trilogue Multi Chat.vi`。

---

## つまずきチェックリスト

- [ ] **`POST` の `timeout (ms)` を 120000 に伸ばしたか**（最頻出。3体で約6秒かかる）
- [ ] URL の末尾が `/api/lv/multi` になっているか（`chat` のままでないか）
- [ ] 受信クラスタのラベルが `ok` / `transcript` / `error` と完全一致しているか
- [ ] `Unflatten From JSON` の `strict validation?` が False（既定）か
      → True にすると `turns` 等の余分なキーでエラーになる
- [ ] Case Structure の出力トンネルを**1つ**にし、True/False 両方から繋いだか
- [ ] `rounds` を送っていないか（送るなら 1〜3。既定値 0 はエラー）
- [ ] `agentIds` を送る場合、ラベルが `agentIds`（複数形・小文字d以外は小文字）か
- [ ] サーバーは起動しているか（ブラウザで `/api/lv/agents` が見えるか）
- [ ] 別PCから繋ぐなら `npm run dev:lan` ＋ ファイアウォールで 3000 番許可

---

## 動作確認用 curl（LV実装前のサニティチェック）

```bash
# 全AIが1巡（agentIds 省略）
curl -X POST http://localhost:3000/api/lv/multi \
  -H "Content-Type: application/json" \
  -d '{"text":"トレーニングを終えました"}'

# AIを指定
curl -X POST http://localhost:3000/api/lv/multi \
  -H "Content-Type: application/json" \
  -d '{"text":"トレーニングを終えました","agentIds":["alpha","beta"]}'
```

`transcript` に全発言が連結されて入っていれば、LV 側は同じPOSTを組むだけでよい。
