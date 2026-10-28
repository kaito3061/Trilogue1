# LabVIEW で患者向けの会話画面を作る手順

`labview/multichat.vi` は、サーバーと往復できるかを確かめるための VI である。
リハビリ中の患者さんに見てもらう画面は、この手順で LabVIEW 上に作る。
会話の制御（誰が何番目に話すか、AI の指示）はサーバーが持つので、ここで作るのは **見せ方だけ** である。

前提:

- `docs/user_manual.md` の手順でサーバーが起動し、`labview/multichat.vi` で3体の返事が出ること
- LabVIEW 2016 以降（HTTP Client VIs と `Unflatten From JSON` を使う）

凡例: `▶Programming > Structures > Event Structure` は、ブロック図で右クリックして出る関数パレットの場所を表す。
LabVIEW の版によってパレットの並びが少し違う。見つからなければ、パレット右上の **Search** で名前を打つ。

---

## 0. どんな画面にするか

このシステムの目的は、リハビリを楽しく続けるための **気分転換・励まし** である。診療アシストではない。
画面もその前提で作る。

| 決めごと | 理由 |
| --- | --- |
| 3体の返事を **1体ずつ** 出し、読む時間をあけて次を出す | 一度に3体分（約220字）を出すと読み切れない。予備実験では、待ち時間（約4秒）より読む時間（約45秒）の方がずっと長かった |
| 待っている間は「考え中」と出し、送信ボタンを押せなくする | 固まったと思って何度も押すのを防ぐ |
| 文字を大きくする（24pt 以上） | リハビリ中、少し離れた位置から読む |
| 画面の下に「体のことは療法士さんへ」と常に出す | 医学的な判断はしない前提を、患者さんにも見える形で示す |
| エラーの英語や JSON は患者さんに見せない | 失敗したときは「少しお休み中です」と出し、詳しい内容は職員用の欄に出す |

完成イメージ:

```
┌──────────────────────────────────────────────────────┐
│  今日のリハビリ、どうでしたか？                        │
│  ┌──────────────────────────────────┐ ┌────────┐   │
│  │ 指が少し動きやすくなった気がします。 │ │  送る  │   │
│  └──────────────────────────────────┘ └────────┘   │
│  [ 楽しかった ] [ 疲れた ] [ 少し痛い ]   ← 任意      │
│                                                      │
│  状態: Beta さんが話しています（2/3）                 │
│                                                      │
│  ┌ Alpha ────────────────────────────────────┐       │
│  │ 動きやすくなったのはうれしいですね！…        │       │
│  └───────────────────────────────────────────┘       │
│  ┌ Beta ─────────────────────────────────────┐       │
│  │ …                                          │       │
│  └───────────────────────────────────────────┘       │
│  ┌ Gamma ────────────────────────────────────┐       │
│  │                                            │       │
│  └───────────────────────────────────────────┘       │
│                                                      │
│  ※ AIは気分転換のおしゃべり相手です。               │
│    体の痛みや心配ごとは、療法士さんに伝えてください。 │
│                                      [ 終わる ]      │
└──────────────────────────────────────────────────────┘
```

---

## STEP 1. 土台の VI を複製する

1. `labview/multichat.vi` を開く
2. `File > Save As...` → **`Copy > Open additional copy`**（または `Substitute copy for original`）を選ぶ
   - **Rename は選ばない。** 元の `multichat.vi` が無くなる
3. 名前を `Trilogue Rehab UI.vi` にして、`labview/` に保存する
4. 以降は複製した方で作業する

`multichat.vi` に入っている HTTP の部品（Open Handle、Add Header、POST、Close Handle）は、そのまま使い回す。

---

## STEP 2. フロントパネルに部品を置く

`Ctrl + E` でフロントパネルへ切り替える。右クリックで出るのはコントロールパレットである。

| 部品 | パレット | ラベル | 設定 |
| --- | --- | --- | --- |
| 入力欄 | `▶Modern > String & Path > String Control` | `入力` | 24pt。右クリック → **Limit to Single Line** |
| 送信ボタン | `▶Modern > Boolean > OK Button` | `送る` | ボタンの文字を「送る」に。動作は既定の **Latch When Released** のまま |
| 状態 | `▶Modern > String & Path > String Indicator` | `状態` | 18pt |
| Alpha の欄 | `▶Modern > String & Path > String Indicator` | `Alpha` | 24pt。縦に3〜4行分広げる。右クリック → `Visible Items > Vertical Scrollbar` |
| Beta の欄 | 同上 | `Beta` | 同上 |
| Gamma の欄 | 同上 | `Gamma` | 同上 |
| 注意書き | `▶Modern > Decorations` の枠 ＋ 文字（パネルをダブルクリックして直接打つ） | — | 「※ AIは気分転換のおしゃべり相手です。体の痛みや心配ごとは、療法士さんに伝えてください。」 |
| 終了ボタン | `▶Modern > Boolean > Stop Button` | `終わる` | |
| サーバーの URL | 既存の `Base URL` | `Base URL` | 値を入れたら右クリック → `Data Operations > Make Current Value Default` |
| 職員用のエラー欄 | `▶Modern > String & Path > String Indicator` | `詳細` | 小さくして画面の端に置く |

文字の大きさの変え方: 部品を選び、ツールバーの **Text Settings**（`Application Font` と書いてあるプルダウン）→ `Size` → `24`。

3体の欄を見分けやすくする:

1. `View > Tools Palette` を開き、**Set Color**（筆のアイコン）を選ぶ
2. 各欄の背景を右クリックして、淡い色を選ぶ（例: Alpha は淡い黄、Beta は淡い青、Gamma は淡い緑）
3. 文字色は黒のままにする（淡い背景に黒が一番読みやすい）

`multichat.vi` から引き継いだ `Transcript` や `OK?` は、ブロック図の配線を直したあとに消す（STEP 6）。

---

## STEP 3. ブロック図の骨組み（While Loop と Event Structure）

`Ctrl + E` でブロック図へ。

ボタンが押されるまで待ち、押されたら1回だけ送る形にする。
`Event Structure` を使うと、何もしていない間に CPU を使わず、ボタンの押し間違いも拾いにくい。

1. `▶Programming > Structures > While Loop` を置き、既存の処理全体を囲むくらい大きく描く
2. その中に `▶Programming > Structures > Event Structure` を置く
3. Event Structure の枠を右クリック → **Edit Events Handled by This Case...**
   - `Event Sources` で **`送る`**、`Events` で **`Value Change`** を選んで OK
4. 枠を右クリック → **Add Event Case...** → `終わる` の `Value Change` を追加
5. `送る` と `終わる` のボタンの端子を、**それぞれのイベントケースの中に** 移す
   - Latch のボタンは、端子が読まれたときに元に戻る。ケースの外に置くと戻らない
6. `終わる` のケースの中で、`True Constant`（`▶Programming > Boolean > True Constant`）を
   While Loop の停止端子（右下の赤い丸）へ配線する
   - 停止端子に繋ぐ線は、ケースの出口（トンネル）を通る。`送る` のケースでは `False Constant` を繋ぐ
7. Event Structure 左上の砂時計（Timeout）は繋がない（ずっと待つ）

---

## STEP 4. 「送る」の中身（順番が大事なので Flat Sequence で区切る）

`送る` のイベントケースの中に `▶Programming > Structures > Flat Sequence Structure` を置き、
右クリック → **Add Frame After** で4コマにする。コマは左から順に実行される。

### コマ1: 受付を止めて「考え中」にする

1. `送る` ボタンを右クリック → `Create > Property Node > Disabled`
   - 出てきたノードを右クリック → **Change All To Write**
   - 値に `2`（Numeric Constant）を繋ぐ。`2` は「押せない・灰色」、`0` は「押せる」
2. `状態` を右クリック → `Create > Local Variable` で `状態` のローカル変数を作り、
   String Constant `考えています…（数秒かかります）` を繋ぐ
3. `Alpha` / `Beta` / `Gamma` のローカル変数を作り、それぞれ空の String Constant を繋ぐ（前回の返事を消す）

### コマ2: サーバーに送る

`multichat.vi` から引き継いだ送信部分を、このコマに移す。送る JSON は `{"text": 入力}` だけでよい。

1. `Bundle By Name` の `text` に `入力` を配線する
2. `Flatten To JSON` → `POST`（URL は `Base URL` ＋ `/api/lv/multi`）
3. **`POST` の `timeout (ms)` に `120000` を繋ぐ。** 既定は10秒で、3体だと足りないことがある
4. 返ってきた本文を `Unflatten From JSON` に入れる。`type` には次のクラスタ定数を繋ぐ

| 部品 | ラベル（JSON のキーと完全一致） |
| --- | --- |
| False Constant | `ok` |
| Array Constant の中に Cluster Constant（中身は下の表） | `turns` |
| String Constant | `error` |

`turns` の中のクラスタ:

| 部品 | ラベル |
| --- | --- |
| Numeric Constant（右クリック → `Representation > I32`） | `order` |
| String Constant | `agentId` |
| String Constant | `agentName` |
| String Constant | `reply` |
| False Constant | `ok` |
| String Constant | `error` |

- `Unflatten From JSON` の **`strict validation?` は False（既定）のまま**。サーバーが返す `transcript` や `count`、`model` は使わないので、クラスタに入れなくてよい
- ラベルは **キャプションではなくラベル** を書き換える。`Visible Items > Label` で確認する

### コマ3: 1体ずつ、読む時間をあけて出す

1. `Unbundle By Name` で `turns` を取り出し、`▶Programming > Structures > For Loop` の左の枠に繋ぐ
   - トンネルが `[]` の形（自動指標付け）になっていることを確認する。1回まわるごとに1体分が出てくる
2. For Loop の中で、もう一度 `Unbundle By Name` を使い、`agentId` / `agentName` / `reply` / `ok` を取り出す
3. `状態` のローカル変数に、`agentName` ＋ `さんが話しています（` ＋ 回数（`i` ＋ 1）＋ `/3）` を
   `▶Programming > String > Concatenate Strings` でつないで書く
   - 数値を文字にするのは `▶Programming > String > Number/String Conversion > Number To Decimal String`
4. 表示する文を決める
   - `ok` が True なら `reply`
   - False なら `（少しお休み中です）`。`▶Programming > Comparison > Select` を使うと1つで書ける
5. `▶Programming > Structures > Case Structure` を置き、`agentId` をセレクタ（左の `?`）に繋ぐ
   - ケース名を右クリック → `Add Case After` で `"alpha"`、`"beta"`、`"gamma"` の3つにする
   - もう1つ `Default` を作り、何もしない（4体目が増えても止まらないように）
   - 各ケースで、`Alpha` / `Beta` / `Gamma` のローカル変数に、4 の文を書く
6. 読む時間を待つ（**ここがこの画面の肝**）
   - `▶Programming > String > String Length` で文字数を数える
   - 文字数 × `200`（ミリ秒）を待ち時間にする。1秒に5文字読む見積である
   - `▶Programming > Comparison > Max & Min` を2つ使い、**3000〜15000 ミリ秒** の範囲に収める
     （短すぎると読めず、長すぎると固まったように見える）
   - その値を `▶Programming > Timing > Wait (ms)` に繋ぐ
   - 最後の1体のあとは待たなくてよいが、最初はそのままでも困らない

1体目を出してすぐ「Beta さんが話しています」と出るのは、サーバーから3体分がまとめて返ってきているからである。
本当に「いま2体目を問い合わせている」ことを画面に出すには、サーバー側に1体ずつ返す仕組みが要る（今後の課題）。

### コマ4: 受付を戻す

1. `状態` のローカル変数に `どうぞ。また話しかけてください。` を書く
2. `送る` の Disabled の Property Node（コマ1と同じ作り方）に `0` を繋ぐ
3. `入力` のローカル変数に空の文字列を繋いで、入力欄を空にする

### 失敗したとき（サーバーに届かない、1体も返事が無い）

- 分ける基準は **`turns` が1件以上あるか** にする
  - `▶Programming > Array > Array Size` で `turns` の数を数え、`▶Programming > Comparison > Greater Than 0?` に繋ぐ
  - その結果を `Case Structure` に繋ぎ、True のケースにコマ3の For Loop を、False のケースにエラー表示を置く
- **全体の `ok` で分けない。** 全体の `ok` は、3体のうち1体でも失敗すると `false` になる。
  それで分けると、取れた2体分の返事まで隠れてしまう。1体ごとの失敗はコマ3の「（少しお休み中です）」で扱う
- False のケースでは、`状態` に `いまお休み中です。職員の方に声をかけてください。` を出し、
  `詳細` に `error` の文言か、`POST` の `error out` のエラー番号を出す
- 患者さんの画面に、英語のエラーや JSON をそのまま出さない

---

## STEP 5.（任意）よく使う言葉をボタンにする

キーボードを打つのが大変な患者さんのために、よくある言葉をボタンにしておく。

1. フロントパネルに `OK Button` を3つ置き、ボタンの文字を `楽しかった` / `疲れた` / `少し痛い` にする
2. Event Structure に、この3つの `Value Change` のケースを足す
   - 1つのケースにまとめてもよい（`Edit Events Handled by This Case...` で3つとも選ぶ）
3. ケースの中で、押されたボタンに対応する文（例: `今日のリハビリは楽しかったです。`）を `入力` のローカル変数に書く
4. そのあと、`送る` と同じ処理を行う。いちばん簡単なのは、`送る` の `Value (Signaling)` プロパティに True を書くこと
   （`送る` を右クリック → `Create > Property Node > Value (Signaling)`。書くと `送る` を押したのと同じイベントが起きる）
   - Latch のボタンには `Value (Signaling)` を書けない。`送る` の動作を **Switch When Released** に変え、
     `送る` のケースの最後で `送る` のローカル変数に False を書いて戻す

「少し痛い」は、サーバーの AI が療法士さんに伝えるよう返すことを確かめてある（`docs/design_decisions.md`）。

---

## STEP 6. 仕上げ

1. `multichat.vi` から引き継いだ `Transcript`、`OK?` など使わなくなった部品を、フロントパネルで消す
2. `Ctrl + B` で切れた配線をまとめて消し、ツールバーの矢印が割れていない（実行できる）ことを確認する
3. 患者さんの前で使う設定
   - `File > VI Properties > Window Appearance` → **Customize...**
     - `Show toolbar when running` などを外すと、実行中に余計なボタンが出ない
   - `File > VI Properties > Execution` → **Run when opened** にチェックすると、開いただけで動き出す
   - `Base URL` や `詳細` は、パネルの端に寄せるか、右クリック → `Advanced > Hide Indicator` で隠す
4. 保存する

---

## STEP 7. 動かして確かめる

サーバーを起動してから、`Trilogue Rehab UI.vi` を実行する。

| 試すこと | 期待する動き |
| --- | --- |
| 「指が少し動きやすくなった気がします。」を送る | 「考えています…」→ Alpha の欄に返事 → 数秒あけて Beta → Gamma。最後に「どうぞ。」 |
| 返事を待っている間に「送る」を押す | 押せない（灰色） |
| 「今日は手首が少し痛いです。」を送る | 3体とも、療法士さんに伝えるよう促す |
| サーバーを止めてから送る | 「いまお休み中です。職員の方に…」と出る。英語のエラーは出ない |
| 「終わる」を押す | VI が止まる |

確かめたら、研究で使う場合は `docs/reproduction_test.md` と同じように、
誰がどの PC で試して、どこで迷ったかを残しておく。

---

## つまずいたとき

| 症状 | 見るところ |
| --- | --- |
| `The cluster element was not found in the JSON` | クラスタのラベルが JSON のキーと違う。`ok` / `turns` / `error`、`turns` の中は `order` / `agentId` / `agentName` / `reply` / `ok` / `error`。大文字・小文字も含めて合わせる。古い `transcript` や `reply` がトップに残っていないか |
| 3体目が出る前にエラーになる | `POST` の `timeout (ms)` が 120000 になっていない |
| ボタンを押しても何も起きない | ボタンの端子がイベントケースの外にある。または Event Structure の `Edit Events...` で `送る` が選ばれていない |
| 1回目は動くが、2回目に押しても反応しない | コマ4で Disabled を `0` に戻していない |
| 「考えています…」が出ないまま返事が出る | コマ1の書き込みが、送信より後に実行されている。Flat Sequence の1コマ目に入っているか |
| 全部の欄に同じ返事が出る | Case Structure のケース名と、書き込み先のローカル変数の組み合わせが違う |
| 表示が途中で切れる | 欄の高さが足りない。縦に広げるか、スクロールバーを出す |
| 待ちが長すぎる・短すぎる | コマ3の「文字数 × 200」の 200 と、3000〜15000 の範囲を調整する。実際に患者さん役に読んでもらって決める |

サーバー側の問題か LabVIEW 側の問題か分からないときは、先にブラウザで `http://<サーバー>:3000/api/lv/agents` を開く。
開かなければサーバー側である（`docs/user_manual.md` 節7）。

---

## 画面を作るうえで変えてよいところ、変えないところ

| 変えてよい | 変えない（サーバー側の約束） |
| --- | --- |
| 色、文字の大きさ、配置、ボタンの言葉 | `/api/lv/multi` に `{"text": ...}` を送ること |
| 読む時間の計算（200 ミリ秒/字、3〜15 秒） | 返ってくる JSON のキー名 |
| 何体分の欄を置くか | AI の指示（会話の範囲の制約）。変えたいときは `lib/agents.ts` を触れる人に相談する |
| 注意書きの言い回し | 「診療アシストではない」ことを画面に出すこと |
