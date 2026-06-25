# Trilogue 研究室セットアップガイド

> 目的: 研究室メンバーが、このサーバーを自分のPCで動かし、LabVIEW から接続できるようにするための手順。
> 前提知識は最小限でよいよう、コマンドを順番に書いています。

---

## 0. このシステムは何か（30秒）

- LabVIEW から文字列を送ると、サーバー経由で LLM（OpenAI）に問い合わせ、AIの返信が LabVIEW に返る。
- サーバーは Next.js（Node.js）製の自作API。既製のLLMツール（Dify等）やDockerは不使用。
- 詳細は `docs/system_architecture.md`（システム構成資料）を参照。

---

## 1. 必要なもの

| 項目 | 内容 |
| --- | --- |
| Node.js | v20 以上推奨（`node -v` で確認） |
| OpenAI APIキー | 有料利用枠のあるキー。研究室の登録キーを使用 |
| LabVIEW | 2016 以降（HTTP Client VIs / JSON VIs を使用） |

---

## 2. サーバーのセットアップ

### ① 取得と依存インストール
リポジトリを取得したフォルダで:

```bash
npm install
```

### ② APIキーの設定
プロジェクト直下に `.env.local` を作成し、以下を記入（このファイルはGit管理外）:

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
# 任意: モデルを変えたい場合
# OPENAI_MODEL=gpt-4o-mini
```

> ⚠ APIキーは秘密情報。`.env.local` を共有・コミットしないこと（`.gitignore` 済み）。

---

## 3. サーバーの起動

| 用途 | コマンド | 接続先 |
| --- | --- | --- |
| 同じPCのLabVIEWから使う | `npm run dev` | `http://localhost:3000` |
| 別PCのLabVIEWから使う（同一LAN） | `npm run dev:lan` | `http://<サーバーPCのIP>:3000` |

起動後、ログに `Ready` と表示されればOK。

### サーバーPCのIP確認
- macOS: `ipconfig getifaddr en0`
- Windows: `ipconfig`（`IPv4 アドレス` を見る）

---

## 4. 疎通確認（LabVIEWの前に必ず）

サーバーが応答するか、ブラウザかコマンドで確認する。

ブラウザ:
```
http://<サーバーIP>:3000/api/lv/agents
```

コマンド（Pythonの検証スクリプト。標準ライブラリのみ・pip不要）:
```bash
python3 scripts/lv_roundtrip_check.py --base-url http://<サーバーIP>:3000
```

`ALL PASS` が出れば、サーバー側は正常。これ以降の問題はLV側、と切り分けられる。

---

## 5. LabVIEW から接続する

VIの作り方（どの部品をどう配線するか）は **`docs/labview_build_guide.md`** にクリック単位で記載。
API仕様（JSON構造・SubVI入出力）は **`docs/labview_interface_spec.md`** を参照。

最小の流れ:
1. `Base URL` に `http://<サーバーIP>:3000` を入力（末尾スラッシュなし）。
2. `User Text` に発話、`Agent ID` に `alpha`（または `beta` / `gamma`）。
3. Run → `Reply` にAI返信が出れば成功。

---

## 6. 別PC間で繋ぐときの注意

1. **同一ネットワーク必須**: サーバーPCとLabVIEW PCが同じWi-Fi/LAN（同じ `192.168.x` 等）にいること。
2. **サーバー側のファイアウォール**: 3000番ポートの着信を許可。
   - macOS: 初回アクセス時の「`node` の着信を許可しますか？」で許可。
   - Windows: 受信規則で TCP 3000 を許可。
3. **IPは変わりうる**（DHCP）。繋がらなくなったら再確認する。

---

## 7. トラブルシュート

| 症状 | 原因の当たり | 対処 |
| --- | --- | --- |
| ブラウザで `/api/lv/agents` が開かない | ネットワーク or ファイアウォール | 同一LANか確認 → 3000番許可 |
| `OK?` が光らない / `Reply` が空 | クラスタのラベル名違い | `reply`/`agentId`/`agentName` 等を大小文字まで一致 |
| `ok:false` で `error` が入る | 入力不正 or APIキー/レート制限 | `error` 文言を確認。429ならレート制限 |
| サーバー起動時に「APIキー未設定」 | `.env.local` 未作成 | 手順2-②を実施 |
| ポート3000が使用中 | 既に起動済み | 既存プロセスを停止するか別ポートを使用 |

---

## 8. 主要ファイルの場所（開発者向け）

| 役割 | 場所 |
| --- | --- |
| LV用エンドポイント | `app/api/lv/chat/route.ts`, `app/api/lv/agents/route.ts` |
| エージェント定義（人格・モデル） | `lib/agents.ts` |
| LLM呼び出し共通部品 | `lib/llm.ts` |
| 型定義（API契約） | `types/chat.ts` |
| 検証スクリプト | `scripts/lv_roundtrip_check.py` |
| 各種ドキュメント | `docs/` |

### エージェントを増やす・変えるには
`lib/agents.ts` の `AGENTS` にエントリを追加するだけ（`id` / `name` / `systemInstruction` / `model`）。
追加した `id` を LabVIEW の `Agent ID` に指定すれば、そのまま使える。
