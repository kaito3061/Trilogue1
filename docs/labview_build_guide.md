# Trilogue Chat.vi 組み立てガイド（クリック単位）

LabVIEW を開きながら**上から順になぞれば** `Trilogue Chat.vi` が完成する手順書。
対象: `POST /api/lv/chat` を1回叩いて AI の返信を受け取る VI。

> 前提: 先に `python3 scripts/lv_roundtrip_check.py` が **ALL PASS** していること。
> （サーバー側が正しい確証を取ってから LV に着手すると、切り分けが楽）

凡例: `▶パレット > サブ > VI名` = ブロック図で右クリック→そのパスのVIを選んで配置。

---

## STEP 0. 新規VIとフロントパネルの部品配置

1. `File > New VI`。
2. **フロントパネル**で右クリック → 以下を配置し、ラベルを正確に付ける。

| 部品 | パレット | ラベル | 備考 |
| --- | --- | --- | --- |
| 文字列入力 | `Modern > String & Path > String Control` | `User Text` | |
| 文字列入力 | 同上 | `Base URL` | 値に `http://localhost:3000` を入力し、右クリック→`Data Operations > Make Current Value Default` |
| 文字列入力 | 同上 | `Agent ID` | 値に `alpha` を入力し既定値化（同上） |
| 文字列表示 | `Modern > String & Path > String Indicator` | `Reply` | 高さを広げ、右クリック→`Visible Items > Vertical Scrollbar` でスクロールバー有効（任意） |
| 丸LED | `Modern > Boolean > Round LED` | `OK?` | |
| 文字列表示 | String Indicator | `Error Msg` | |
| エラー入力 | `Modern > Array, Matrix & Cluster > Error In 3D.ctl` | `error in` | |
| エラー出力 | `Error Out 3D.ctl` | `error out` | |

> 文字列表示は右クリック →『**'\' Codes Display**』ではなく『**Normal Display**』のままでOK（UTF-8の日本語をそのまま表示）。

---

## STEP 1. 送信用クラスタ（Request）を作る

ブロック図（`Ctrl+E` で切替）で作業。

1. `▶Programming > Cluster, Class, & Variant > Cluster Constant` を配置。
2. その**枠の中**に `▶Programming > String > String Constant` を**2個**ドラッグして入れる。
3. 各 String Constant のラベルを編集（ラベル表示は右クリック→`Visible Items > Label`）:
   - 1個目のラベル = `text`
   - 2個目のラベル = `agentId`
   - ⚠ **このラベルがそのまま JSON のキーになる。スペル・大文字小文字を厳守**（`text`, `agentId`）。

> このクラスタ定数は「構造のひな型」。値は次の Bundle で上書きする。

---

## STEP 2. パネルの入力をクラスタに差し込む

1. `▶Programming > Cluster, Class, & Variant > Bundle By Name` を配置。
2. `Bundle By Name` の**中央入力（cluster）**に STEP1 のクラスタ定数を配線。
   - すると左の名前選択欄に `text` / `agentId` が出る。
3. 名前欄を下に引き伸ばして 2 要素表示にし、
   - `text` の入力に フロントパネルの **`User Text`** を配線。
   - `agentId` の入力に **`Agent ID`** を配線。
4. `Bundle By Name` の出力 = 完成した Request クラスタ。

---

## STEP 3. JSON 文字列に変換

1. `▶Programming > Cluster, Class, & Variant > Flatten To JSON` を配置。
2. STEP2 の出力クラスタを `Flatten To JSON` の **`anything`** 入力へ配線。
3. 出力 **`JSON string`** が POST の本文になる。

---

## STEP 4. URL を組み立てる

1. `▶Programming > String > Concatenate Strings` を配置。
2. 入力1 = フロントパネルの **`Base URL`**。
3. 入力2 = `String Constant` に `/api/lv/chat` と入力したもの。
4. 出力 = 完全なURL（例 `http://localhost:3000/api/lv/chat`）。

---

## STEP 5. HTTP クライアント（開く → ヘッダ → POST → 閉じる）

すべて `▶Data Communication > Protocols > HTTP Client` パレット内。

1. **`Open Handle`** を配置（入力は未接続でOK）。出力 `client handle out` が出る。
2. **`Add Header`** を配置。
   - `client handle in` ← STEP5-1 の `client handle out`
   - `header` 入力 ← String Constant `Content-Type`
   - `value` 入力 ← String Constant `application/json`
3. **`POST`** を配置（HTTP Client パレットの GET/HEAD/**POST**/PUT/DELETE）。
   - `client handle in` ← STEP5-2 の handle
   - `url` ← STEP4 の連結URL
   - `buffer`（送信本文）← STEP3 の `JSON string`
   - 出力 `body` ＝ サーバーからの応答JSON文字列
4. **`Close Handle`** を配置。
   - `client handle in` ← STEP5-3（POST）の `client handle out`
5. **エラー線**：`error in`(パネル) → Open Handle → Add Header → POST → Close Handle と
   `error in/out` 端子を**左から右へ一直線**に繋ぐ。

> handle の線（紫系）と error の線（濃い線）を、4つのVIに順番に通すのがポイント。

---

## STEP 6. 応答 JSON を解析（Unflatten）

1. **受信用クラスタ定数（型のひな型）**を作る。
   `Cluster Constant` の中に以下を配置し、ラベルを厳密に付ける:
   | 順 | 部品 | ラベル |
   | --- | --- | --- |
   | 1 | False Constant（`Boolean > False Constant`。"Boolean Constant"という名前の部品は無い） | `ok` |
   | 2 | String Constant | `reply` |
   | 3 | String Constant | `agentId` |
   | 4 | String Constant | `agentName` |
   | 5 | String Constant | `model` |
   | 6 | String Constant | `error` |
   - ⚠ ラベルは応答キーと完全一致（`ok`,`reply`,`agentId`,`agentName`,`model`,`error`）。
2. `▶Programming > Cluster, Class, & Variant > Unflatten From JSON` を配置。
   - `JSON string` ← STEP5-3（POST）の `body`
   - `type`（既定値の型）← STEP6-1 のクラスタ定数
   - 出力 `value` ＝ 値が入った応答クラスタ。

---

## STEP 7. 結果をパネルに出す

1. `▶Programming > Cluster, Class, & Variant > Unbundle By Name` を配置。
2. 入力に STEP6 の `value` を配線 → 名前欄を伸ばして全要素表示。
3. 配線:
   - `ok` → フロントパネル **`OK?`**
   - `reply` → **`Reply`**
   - `error` → **`Error Msg`**
4. `error out`(パネル) に STEP5 の最終 `error out` を配線。

### （任意）ok で分岐して見やすくする
- `▶Programming > Structures > Case Structure` を置き、セレクタに `ok` を配線。
- **True** ケース: `reply` を `Reply` に。
- **False** ケース: `error` を `Reply` に出す（または `Error Msg` を強調）。

---

## STEP 8. 実行テスト

1. 別ターミナルでサーバー起動: `npm run dev`（同一PCの場合）。
2. VI のフロントパネルで `User Text` に「こんにちは」と入力。
3. `Agent ID` は `alpha`（または `beta` / `gamma`）。
4. ▶ **Run**（白矢印）をクリック。
5. 期待結果: `OK?` のLEDが点灯し、`Reply` に AI の返信が出る。

---

## STEP 9. SubVI 化（再利用のため）

1. フロントパネル右上の**コネクタペーン**を右クリック → `Patterns` で端子数を選択。
2. 端子に割り当て:
   - 入力: `Base URL`, `User Text`, `Agent ID`, `error in`
   - 出力: `Reply`, `OK?`, `Error Msg`, `error out`
3. アイコンを編集して保存名 `Trilogue Chat.vi`。
4. 以後は上位VIから `User Text` と `Agent ID` を渡すだけで AI と往復できる。

---

## つまずきチェックリスト

- [ ] クラスタの**ラベル名**が JSON キーと完全一致しているか（最頻出ミス）
- [ ] `Content-Type: application/json` ヘッダを付けたか
- [ ] POST の `buffer` に JSON 文字列を入れたか（`url` と取り違えやすい）
- [ ] `Close Handle` を通したか（handle リーク防止）
- [ ] サーバーは起動しているか（ブラウザで `/api/lv/agents` が見えるか）
- [ ] 別PCから繋ぐなら `npm run dev:lan` ＋ ファイアウォールで 3000 番許可
