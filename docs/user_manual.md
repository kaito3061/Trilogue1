# Trilogue 使い方マニュアル（研究室メンバー向け）

入口はリポジトリ先頭の `README.md`（「初めて使う人へ」）である。この文書はその先の通し手順である。

松田研究室の計測系は LabVIEW で動いている。
このシステムは、**LabVIEW から1回文字列を送るだけで LLM（大規模言語モデル）と会話できる**入口である。
自分の計測画面を作り直す必要はない。

```
自分のLabVIEW  ── 文字列を1回送る ──▶  このサーバー  ──▶  LLM
                 ◀── 返信が返る ────────┘
```

複数のAIに順番に発言させる場合も、LabVIEW側の作業は同じ1回である。
発言の順番はサーバーが決める。

対象読者: 初めて触る学部生（B3）でも、先輩や先生に付きっきりで見てもらわずに進めること。
プログラミングは前提にしない。自分のOSの見出しだけ読めばよい。

サーバーは **Windows / macOS / Linux** のどれでも起動できる。
LabVIEW は研究室では Windows 機で使うことが多いが、Mac 版 LabVIEW でも同じ VI を開ける。

最初に折れやすいのは、あとから出てくる **APIキー** と **Docker Desktop の初回** である。
いまの画面での手順は節2・節3に書いてある。ボタン名が違ったら、
「画面が変わったとき」の文面を AI に貼る。変わらないのは、終わったときに手元にあるものである。

---

## 通しでやること（チェック）

- [ ] ZIP を落として展開した。`README.md` と `docker-compose.yml` が同じフォルダにある
- [ ] Docker が起動している（左下が緑、またはクジラのアイコンが Ready）
- [ ] `.env.local` にキーを書いた（拡張子は `.txt` ではない）
- [ ] `docker compose up --build` のあと、ブラウザで `http://localhost:3000/api/lv/agents` が開く
- [ ] `labview/multichat.vi` を開き、URL を `http://localhost:3000` にして実行した

途中で画面が手順と違ったら、節「画面が変わったとき」の文面を AI に貼る。

---

## 0. まず知っておくこと

### このシステムの目的

**リハビリ患者が運動を「楽しく続ける」ための、気分転換・励ましの仕組み**である。
複数のAIが異なる視点で声をかけることで、単調さを和らげる。

> ⚠️ **診療アシスト（診断支援）ではない。** 患者からの医学的な質疑応答は想定していない。
> AIは励ましや問いかけをするが、治療や運動の指示は出さない。

### 運用上の注意

- **APIキーはサーバー側だけが持つ。** LabVIEW にキーを書かない。他人に見せない。
- **実データ（患者情報など）はまだ送らない。** いまは動作確認用の文章だけを送る。
- サーバーを止めると LabVIEW から繋がらなくなる。使うあいだは起動したままにする。
- 困ったらこの文書の「7. うまくいかないとき」を先に見る。

必要なもの:

| 項目 | Windows | macOS | Linux |
| --- | --- | --- | --- |
| サーバーを動かす箱 | [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 同左（Apple チップ / Intel を選ぶ） | Docker Engine（または Docker Desktop） |
| OpenAI APIキー | 研究室で使うキー。先生または柴尾に確認する | 同左 | 同左 |
| LabVIEW | 2016以降。同梱の VI を開く | 同左（入っている場合） | LabVIEW は通常入っていない。サーバー役にする |

よくある分担:

- **同じPCで全部やる** … そのPCでサーバーを起動し、同じPCの LabVIEW から `http://localhost:3000` で繋ぐ
- **サーバーと LabVIEW が別PC** … サーバー側は Windows / Mac / Linux のどれでもよい。LabVIEW側は URL をサーバーPCのIPにする

---

## 画面が変わったとき（AI への聞き方）

公式サイトのボタン名や配置は、この文書を書いているあいだにも変わる。
**変わらないのは、最後に手元に残るもの**である。

| 作業 | 終わったときに手元にあるもの |
| --- | --- |
| APIキー | `sk-` で始まる長い文字列。他人に見せない |
| Docker | アプリが起動していて、ターミナルで `docker compose version` が通る |
| サーバー | ブラウザで `http://localhost:3000/api/lv/agents` が開く |

画面が手順と違う、またはエラーが出たら、AI（ChatGPT など）に次を**そのまま貼る**。
自分の OS と、見えている文言だけ書き換える。

**キーを発行したいとき**

```
今の日付で、OpenAI の API キーを新規発行する手順を教えてください。
OSは（Windows / macOS / Linux）です。
欲しいものは sk- で始まる API キーです。
画面のボタン名が昔の解説と違っても、今の画面に合わせてください。
支払い方法の登録とクレジット（前払い残高）の買い方、
使いすぎを防ぐ上限の設定方法、キーを他人に見せてはいけないことも書いてください。
使うモデルは gpt-4o-mini です。今の料金の目安も教えてください。
```

**Docker が入らない・起動しないとき**

```
今の日付で、（Windows / macOS / Linux）に Docker を入れて起動する手順を教えてください。
目的は、ターミナルで docker compose version が通ることです。
Windows なら WSL2、Mac なら Apple silicon と Intel の選び方も今の画面に合わせてください。
次のエラーが出ています。原因と次に押すものを、今の画面の名前で教えてください。
（ここにエラー文をそのまま貼る）
```

**サーバーが起きないとき**

```
フォルダに docker-compose.yml と .env.local があります。
docker compose up --build を実行したら、次のログ／エラーが出ました。
何が足りないか、次に何を確認すればよいかを教えてください。
（ここにログをそのまま貼る）
```

AI にキーの中身は貼らない。エラー文と OS 名だけで足りる。
返ってきた手順で「終わったときに手元にあるもの」が揃えば、この文書の続きに戻る。

Docker の入れ方そのものが大きく変わっていたとき（何年も後に読んでいる場合など）は、
節「2-4. 将来、この手順どおりに進まなくなったとき」を見る。

研究室に共有キーがある場合は、発行手順を自分で踏まなくてよい。
柴尾または先生から受け取って、節3の「3-5. `.env.local` に書く」だけやる。

---

## 1. ファイルを手元に置く

Git は使わなくてよい。ブラウザだけで足りる。

1. ブラウザで開く: <https://github.com/kaito3061/Trilogue1>
2. 緑の **Code** を押す
3. **Download ZIP** を押す（Clone しなくてよい）
4. ダウンロードした `Trilogue1-main.zip` を展開する
   - Windows: ZIP を右クリック → 「すべて展開」
   - macOS: ZIP をダブルクリック
   - Linux: ファイルマネージャで展開するか `unzip Trilogue1-main.zip`
5. 展開してできたフォルダを、デスクトップなど分かりやすい場所へ移す
6. フォルダを開いて、**同じ階層に** `README.md` と `docker-compose.yml` があることを確認する

よくある失敗: 展開すると `Trilogue1-main` の中に、もう一段 `Trilogue1-main` がある。
作業するのは、`docker-compose.yml` が見える方である。一段深い方にいると、あとでキーが見つからない。

---

## 2. Docker Desktop を入れる

ここが初見で一番止まる。
到達点は次の2つが同時に満たされていること。

1. Docker Desktop（または Linux の Docker Engine）が **起動している**
2. ターミナルで `docker compose version` と打つと、バージョンの数字が出る

すでに両方できている人は、節3へ進む。
画面のボタン名が下と違うときは、「画面が変わったとき」の Docker 用の文面を AI に貼る。

研究室の共有PCで、管理者権限が無くてインストーラが止まったら、自分では入れられない。
そのときは先生または管理者に「Docker Desktop を入れて起動した状態にしてほしい」と頼む。

### 2-1. Windows（Docker Desktop）

全体で 20〜40 分見ておく（ダウンロードと再起動を含む）。途中で PC の再起動が1〜2回入る。

#### (A) 入れる前に確認する（5分）

ここで引っかかると、インストールしても動かない。先に4つ見る。

| 確認すること | 見方 | 条件 |
| --- | --- | --- |
| Windows の版 | `Windows + R` → `winver` と打って Enter | Windows 10 または 11 の 64 ビット。ずっと更新していない PC は、先に Windows Update を済ませる |
| CPU の種類 | 設定 → システム → バージョン情報 → 「システムの種類」 | `x64 ベース プロセッサ` か `ARM ベース プロセッサ` か。ダウンロードする版が変わる |
| 仮想化が有効か | `Ctrl + Shift + Esc` でタスクマネージャー → パフォーマンス → CPU → 右下の「仮想化」 | **有効** になっていること。無効なら下の「よく止まるところ」を見る |
| 管理者権限 | スタート → 設定 → アカウント → 自分の名前の下 | 「管理者」と書いてあること。無ければ自分では入れられない（研究室PCは管理者に頼む） |

空き容量は C ドライブに 10GB 以上あると安心である（Docker 本体と、このシステムのイメージで数GB使う）。

#### (B) ダウンロードする（5分）

1. ブラウザで <https://www.docker.com/products/docker-desktop/> を開く
2. **Download Docker Desktop** のボタンを押す。押すと OS の選択肢が出る
3. (A) で見た CPU に合わせて選ぶ
   - `x64` → **Windows - AMD64**（Intel の CPU でもこちら。AMD64 は64ビットの名前で、AMD製という意味ではない）
   - `ARM` → **Windows - ARM64**
4. `Docker Desktop Installer.exe` がダウンロードフォルダに落ちてくる（約500MB）

アカウント登録（Sign up）を求められても、ダウンロードには不要である。

#### (C) インストールする（10分）

1. `Docker Desktop Installer.exe` をダブルクリックする
2. 「このアプリがデバイスに変更を加えることを許可しますか」→ **はい**
3. Configuration の画面でチェックが2つほど出る
   - **Use WSL 2 instead of Hyper-V (recommended)** … **チェックを入れたまま**
   - **Add shortcut to desktop** … どちらでもよい
4. **OK** を押す。ファイルの展開が数分続く
5. `Installation succeeded` が出たら **Close and restart**（または Close のあと手動で再起動）
   - **ここで再起動しないと、エンジンが起きない**

WSL 2 は「Windows の中で Linux を動かす部品」である。Docker はこの上で動く。
インストーラが自動で入れることが多いが、入らなかったときは (D) の手順8で入れる。

#### (D) 初回起動（5〜10分）

1. 再起動後、スタートメニューで `Docker Desktop` と打って開く
2. **Docker Subscription Service Agreement**（利用規約）→ **Accept**
   - 大学での研究・教育目的なら、無料の Personal プランの範囲で使える（2026年時点）。
     規約は変わることがあるので、気になる場合は先生に確認する
3. 「Sign in / Sign up」画面 → 右上や下の **Skip**（または Continue without signing in）
   - サインインしなくても、このシステムは動く
4. アンケート（役割や用途を聞く画面）→ **Skip**
5. Docker Desktop の窓が開く。**左下**に状態が出る
   - `Engine starting` … 待つ（初回は2〜5分）
   - `Engine running`（緑） … 完了
6. 右下の通知領域（時計の左。`^` を押すと隠れているアイコンが出る）にクジラが出ていれば起動している
7. 窓は閉じてもよい（右上の × で窓を閉じても、裏で動き続ける）
8. 「WSL needs updating」「WSL 2 installation is incomplete」と出た場合
   1. スタートメニューで `cmd` と打ち、**コマンドプロンプトを右クリック → 管理者として実行**
   2. 次を打って Enter

      ```bat
      wsl --update
      ```

   3. 入っていないと言われたら、代わりに `wsl --install` を打つ
   4. 終わったら PC を再起動し、手順1からやり直す

次回以降は、PC を起動したあとに Docker Desktop を開くだけでよい。
毎回開くのが面倒なら、Docker Desktop の設定（歯車）→ General →
**Start Docker Desktop when you sign in to your computer** にチェックを入れる。

#### (E) 確認する（コマンドプロンプト）

1. スタートメニューで `cmd` と打って、コマンドプロンプトを開く
2. 次を打って Enter

```bat
docker compose version
```

`Docker Compose version v2.` のように数字が出れば成功である。

よく止まるところ:

| 見えているもの | 意味 | やること |
| --- | --- | --- |
| `docker` は、内部コマンドまたは外部コマンド… | Docker Desktop が止まっているか、入っていない | スタートから Docker Desktop を開き、左下が緑になるまで待つ。そのあとコマンドプロンプトを開き直す |
| WSL 2 installation is incomplete | Windows の仮想化部品が足りない | インストーラまたは Microsoft の案内どおり WSL2 を入れる。再起動する |
| Hardware assisted virtualization / Virtualization support not detected | BIOS で仮想化がオフ | 研究室PCなら管理者に頼む。自分のPCなら下の「仮想化を有効にする」 |
| インストールできない（管理者） | 権限が無い | 自分では進めない。管理者に依頼する |
| `Engine starting` のまま10分以上 | WSL が古い、または起動に失敗している | Docker Desktop を右下のクジラ → Quit で終了 → (D) の手順8で `wsl --update` → 再起動 |
| `Docker Desktop - Unexpected WSL error` | WSL の状態が壊れている | 管理者のコマンドプロンプトで `wsl --shutdown` → Docker Desktop を開き直す。直らなければエラー文を AI に貼る |
| ダウンロードした exe が開かない／ブロックされた | 大学のセキュリティソフト | 研究室PCなら管理者に頼む。自分のPCなら右クリック → プロパティ → 「許可する」 |

仮想化を有効にする（自分のPCの場合のみ）:

1. 設定 → システム → 回復 → 「PC の起動をカスタマイズする」の **今すぐ再起動**
2. トラブルシューティング → 詳細オプション → **UEFI ファームウェアの設定** → 再起動
3. BIOS 画面で、`Intel Virtualization Technology`（Intel）または `SVM Mode`（AMD）を **Enabled** にする
   - 置き場所はメーカーごとに違う（Advanced / CPU Configuration の中が多い）。見つからなければ
     「（PCのメーカーと型番） BIOS 仮想化 有効」で検索するか、AI に型番を伝えて聞く
4. 保存して終了（多くは `F10`）。タスクマネージャーで「仮想化: 有効」になったか確認する

### 2-2. macOS（Docker Desktop）

チップの種類を間違えると入らない。先に確認する。

1. 左上のリンゴマーク → **この Mac について**
2. チップの欄を見る
   - **Apple M1 / M2 / M3 / M4** → ダウンロードは **Apple silicon** 版
   - **Intel** と書いてある → **Intel** 版

入れ方:

1. <https://www.docker.com/products/docker-desktop/> を開く
2. Mac 用を選び、上で確認したチップの方を落とす
3. 落ちてきた `.dmg` を開く
4. クジラのアイコンを、Applications（アプリケーション）へドラッグする
5. アプリケーションから Docker を開く
   - 「インターネットからダウンロードされたアプリです」と出たら **開く**
6. 初回はパスワード（Mac にログインするときのやつ）を求められる。入れる
7. 利用規約（Accept）を進める
   - 「Use recommended settings」と出たら、そのまま **Finish**（パスワードをもう一度求められることがある）
   - Sign in / Sign up とアンケートの画面は **Skip** でよい。サインインしなくても動く
8. メニューバー（画面右上）のクジラのアイコンが動き終わり、Docker Desktop が **Ready** になるまで待つ
   - 初回は数分かかる

確認（ターミナル）:

1. アプリケーション → ユーティリティ → ターミナル を開く
2. 次を打って Enter

```bash
docker compose version
```

数字が出れば成功である。

よく止まるところ:

| 見えているもの | やること |
| --- | --- |
| チップが違うと言われる | 「この Mac について」を見て、正しい版を入れ直す |
| クジラがいつまでも回る | 5分待っても Ready にならなければ、Docker Desktop を終了して開き直す |
| `docker: command not found` | Docker Desktop が起動していない。クジラが Ready になってから、ターミナルを開き直す |

### 2-3. Linux（Ubuntu など）

研究室の Linux 機でサーバーだけ動かす場合。Docker Desktop でもよいが、Engine の方が軽い。

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

入れたあとは **一度ログアウトして、入り直す**。これをしないと `permission denied` になる。

```bash
docker compose version
```

バージョンが出ればよい。
`docker-compose`（ハイフンあり）しか無い古い環境では、この文書の `docker compose` を `docker-compose` に読み替える。

Docker Desktop for Linux を使う場合は、公式の Linux 用インストーラに従う。
画面が違ったら、AI への文面の OS を Linux にする。

### 2-4. 将来、この手順どおりに進まなくなったとき

この節の画面・ボタン名は 2026年10月時点のものである。
数年たつと、ボタン名・インストーラの形・必要な部品（WSL など）が変わっている可能性が高い。
そのときは、手順を1つずつ合わせようとせず、次の順で「到達点」に辿り着く。

**到達点（これだけは変わらない）**

> ターミナル（Windows はコマンドプロンプト）で `docker compose version` と打つと、バージョンの数字が出る。

これが出れば、どんな入れ方をしたかは問わない。節3へ進んでよい。

**辿り着き方**

1. **公式の手順を見る**。検索するなら「Docker Desktop install Windows」（OS は自分のものに変える）。
   公式のインストール手順は <https://docs.docker.com/desktop/> の下にある。
   日本語の解説記事より、公式の英語ページの方が新しい。ブラウザの翻訳機能で読めばよい
2. **公式の「System requirements（動作条件）」を先に読む**。
   Windows の版や WSL の版の条件が上がっていることが多い。足りなければ Windows Update が先
3. **詰まったら AI に聞く**。上の「画面が変わったとき」の Docker 用の文面に、
   次の3つを足して貼る
   - 今日の日付
   - 自分の OS と版（`winver` の結果、または「この Mac について」の内容）
   - 画面に出ている文言、またはエラー文をそのまま
4. **AI の答えは、到達点で確かめる**。AI は古い手順を答えることがある。
   言われたとおりにやっても `docker compose version` が出なければ、
   「この手順でやったが、次のエラーが出た」とエラー文を貼って聞き直す

**Docker Desktop 自体が使えなくなっていたら**

有料化・提供終了・研究室PCに入れられない、などで Docker Desktop が使えない場合でも、
`docker compose` が使える別のソフトがあれば同じ手順で動く。
AI には次のように聞く。

```
今の日付で、Docker Desktop の代わりに docker compose コマンドを使える
（Windows / macOS / Linux）向けの無料のソフトを教えてください。
大学の研究室で使います。docker-compose.yml をそのまま動かしたいです。
インストール手順と、docker compose version で確認する方法も教えてください。
```

それも難しい場合は、Docker を使わず Node.js で直接起動する方法がある（`README.md` の「Node.js を直接使う場合」）。
こちらは Node.js のインストールが必要になる。

**手順が変わっていたら、この文書を直す**

自分が通った新しい手順を、この節の上（2-1〜2-3）に書き足すか、日付付きで追記する。
次の学生が同じところで止まらないようにするためである。

---

## 3. APIキーを用意して置く

サーバーは、キーが無いと LLM に問い合わせできない。
キーはリポジトリに入っていない。自分のPCにだけ置く。

**到達点:** `sk-` で始まる長い文字列（OpenAI の API キー）が手元にあり、
それが `.env.local` に書いてあること。

キーの入手方法は2通りある。

| 方法 | こんなとき | やること |
| --- | --- | --- |
| 研究室の共有キーをもらう | 研究室でキーを用意している | 先生（または管理している人）から受け取る → 3-5 へ |
| 自分で発行する | 共有キーが無い、または自分の実験用に分けたい | 3-1〜3-4 をやる。**支払い方法の登録が必要**なので、費用を誰が持つか先に先生に確認する |

### 3-1. 先に知っておくこと（お金と ChatGPT との違い）

- **ChatGPT（chatgpt.com）と API（platform.openai.com）は別の契約である。**
  ChatGPT Plus に入っていても、API は使えない。API は使った分だけ払う前払い制である
- API を使うには、クレジットカードを登録して **クレジット（前払い残高）を買う** 必要がある。
  最低額は数ドル（2026年時点で 5 ドル）。残高が0になると、サーバーは `ok:false` を返すようになる
- このシステムが使う `gpt-4o-mini` は安いモデルである。3体で1回会話しても、
  費用はおおむね1円に届かない（入力と出力の長さで変わる）。5 ドルあれば動作確認には十分足りる
- 料金は変わる。最新は <https://openai.com/api/pricing/> で確認する

### 3-2. OpenAI のアカウントを作る（5分）

1. ブラウザで <https://platform.openai.com/> を開く
   - `chatgpt.com` ではない。`platform` の方である
2. 右上の **Sign up**（アカウントがあれば **Log in**）
3. メールアドレス、または Google / Microsoft / Apple のアカウントで登録する
   - 大学のメールで登録すると、研究用だと分かりやすい
4. 届いたメールのリンクを押して確認する
5. 名前・生年月日などを入れる
6. 組織名（Organization）を聞かれたら、`Matsuda Lab` など分かる名前でよい
7. 電話番号の確認（SMS）を求められたら、自分の携帯番号を入れて届いた数字を打つ

### 3-3. クレジットを買う（5分）

1. platform.openai.com にログインした状態で、右上の **歯車（Settings）** を押す
2. 左のメニューで **Billing** を押す
3. **Add payment details**（支払い方法を追加）を押す
   - 「Individual（個人）」か「Company（組織）」を聞かれたら、自分で払うなら Individual
4. クレジットカードの情報を入れる
5. 最初に買う額を入れる。動作確認だけなら最低額（5 ドル）でよい
6. **Auto recharge（自動チャージ）は オフ** のままにする
   - オンにすると、残高が減るたびに自動でカードから引き落とされる
7. Billing の画面に残高（Credit balance）が出ていれば完了

使いすぎを防ぐために、Settings → **Limits** で月の上限（Budget）を決めておくとよい。

### 3-4. API キーを発行する（3分）

1. platform.openai.com の Settings、または左のメニューから **API keys** を開く
   - 直接開くなら <https://platform.openai.com/api-keys>
2. **Create new secret key** を押す
3. 出てきた入力欄を埋める
   - **Name**: 何に使うキーか分かる名前（例: `trilogue-labpc`）
   - **Project**: 既定の `Default project` のままでよい
   - **Permissions**: **All** のままでよい
4. **Create secret key** を押す
5. `sk-` で始まる長い文字列が表示される。右の **コピー** ボタンで写す
   - **この画面を閉じると、二度と表示されない。** すぐに 3-5 の `.env.local` に貼る
   - 閉じてしまったら、そのキーは諦めて、もう一度 Create new secret key で作り直す
6. **Done** を押して閉じる

キーの扱い:

- キーを知っている人は、**あなたの残高で** LLM を使える。人に見せない、チャットやメールに貼らない、GitHub に上げない
- 漏れたかもしれないときは、API keys の画面でそのキーの **ゴミ箱（Revoke）** を押して無効にし、新しく作る
- 使い終わった PC のキーも、同じ画面から消しておく

画面の名前やメニューの位置が上と違ったら、節「画面が変わったとき」の
「キーを発行したいとき」の文面を AI に貼る。欲しいのは `sk-` で始まる文字列だけである。

### 3-5. `.env.local` に書く

中身はどのOSでも同じ。

```
OPENAI_API_KEY=ここにキーを貼る
OPENAI_MODEL=gpt-4o-mini
```

このファイルをメールやチャットに貼らない。GitHub にも上げない。

#### Windows

1. 展開したフォルダ（`docker-compose.yml` がある場所）をエクスプローラーで開く
2. 上のメニュー **表示** → **ファイル名拡張子** にチェックを入れる
   - Windows 11 なら「表示 → 表示」の中にあることが多い
3. `.env.local.example` を右クリック → コピー → 同じフォルダで貼り付け
4. コピーしたファイルの名前を **`.env.local`** にする
   - 「拡張子を変更すると使えなくなる」と出たら **はい**
   - 名前の末尾が `.txt` になっていないか、もう一度見る。なっていたら `.txt` を消す
5. `.env.local` を右クリック → プログラムから開く → メモ帳
6. `OPENAI_API_KEY=` の右に、キーを貼る。引用符 `"` は付けない
7. 保存して閉じる

`.env.local` は `docker-compose.yml` と **同じフォルダ** に置く。一段内側だと読めない。

#### macOS

1. 展開したフォルダを Finder で開く
2. `.env.local.example` が見えないときは、`Command + Shift + .` で隠しファイルを表示する
3. そのファイルを複製し、名前を `.env.local` にする
4. テキストエディットで開く。保存形式は **標準テキスト**（リッチテキストにしない）

ターミナルからやる場合（展開したフォルダにいること）:

```bash
cp .env.local.example .env.local
open -e .env.local
```

#### Linux

```bash
cp .env.local.example .env.local
nano .env.local
```

`Ctrl + O` で保存、`Ctrl + X` で閉じる。

---

## 4. サーバーを起動する

**先に Docker Desktop を起動し、左下が緑（Mac ならクジラが Ready）になるまで待つ。**
止まっている状態でコマンドを打つと、必ず失敗する。

起動するコマンドはどのOSでも同じ。

```bash
docker compose up --build
```

初回はイメージを作るので 3〜10 分かかることがある。大学のWi-Fiが遅いとさらに伸びる。
途中で `Downloading` や `#1` `#2` のような行が流れるのは正常である。止めない。
ログに `Ready` が出れば起動できている。この窓は **閉じない**。閉じるとサーバーが止まる。

### Windows

1. Docker Desktop の左下が緑であることを確認する
2. `docker-compose.yml` があるフォルダをエクスプローラーで開く
3. 上のアドレスバーをクリックして、今の文字を消す
4. `cmd` と打って Enter（そのフォルダでコマンドプロンプトが開く）
5. 開いた窓に `docker compose up --build` と打って Enter

`docker-compose` とハイフンで繋がった古い書き方でも動くことがある。
`docker` が認識されない、と出たら Docker Desktop が止まっている。緑を確認して、コマンドプロンプトを開き直す。

### macOS

1. メニューバーのクジラが Ready であることを確認する
2. `docker-compose.yml` があるフォルダを Finder で開く
3. フォルダを右クリック → 「フォルダに新規ターミナル」（または「サービス」の中）
   - 出ないときは、ターミナルを開き、`cd `（シーディーとスペース）のあとに、そのフォルダをターミナルへドラッグして Enter
4. `docker compose up --build` と打って Enter

### Linux

```bash
cd ~/Desktop/Trilogue1
docker compose up --build
```

権限エラー（`permission denied`）が出たら、節2の `usermod` のあとログアウトし直していない。

### 起動できたか確認する

サーバーを動かしている **そのPCのブラウザ** で次を開く。

```
http://localhost:3000/api/lv/agents
```

`alpha` / `beta` / `gamma` の名前が出る JSON が見えれば、サーバーは生きている。
どのOSでもこの確認は同じである。白い画面や「接続できない」なら、まだ Ready になっていないか、窓を閉じてしまっている。

よく止まるところ:

| 見えているもの | やること |
| --- | --- |
| `Cannot connect to the Docker daemon` | Docker Desktop を起動し、緑／Ready になってから同じコマンドをやり直す |
| `.env.local` が無い / env file not found | 節3に戻る。`docker-compose.yml` と同じフォルダか、名前が `.env.local.txt` になっていないかを見る |
| `APIキー未設定` で落ちる | `.env.local` の `OPENAI_API_KEY=` の右が空。キーを貼ってもう一度 `docker compose up --build` |
| ずっと Downloading で止まる | ネットが切れている。大学Wi-Fiを繋ぎ直して、同じコマンドをもう一度 |
| ポート 3000 が使われている | すでに起動している。ブラウザで上の URL を開いてみて、開くならそのままでよい |

---

## 5. LabVIEW から使う

同梱の VI を開く。ゼロから組む必要はない。
VI の操作は OS で変わらない。

| やりたいこと | 開くファイル |
| --- | --- |
| AI 1体と往復する | `labview/chat.vi` |
| 1回送って複数AIに順番に発言させる | `labview/multichat.vi` |

### 同じPCで LabVIEW を動かす場合

1. 上の VI を開く
2. フロントパネルの URL（`Base URL` など）を `http://localhost:3000` にする
   - 末尾に `/` を付けない
3. 入力欄に文章を入れる
   - 例: `リハビリのトレーニングを終えました。指が少し動きやすくなった気がします。`
4. 実行（Run）する
5. 返信欄に文章が出れば成功

`chat.vi` では `Reply` に1体の返信が出る。
`multichat.vi` では `Transcript` に3体の発言がまとめて出る。

複数AIのときは **3体でおよそ6秒** かかる。待ってから結果を見る。

### LabVIEW が別のPCにある場合

サーバー側のOSは問わない。LabVIEW側は URL だけ合わせる。

1. サーバーを動かしているPCと、LabVIEWのPCを **同じWi-Fi / LAN** にする
2. サーバーPCで IP を確認する（次の表）
3. LabVIEW の URL を `http://192.168.x.x:3000` にする（自分のIPに置き換える）
4. ファイアウォールで 3000 番を許可する（次の表）

| サーバーのOS | IPの確認 | ファイアウォール |
| --- | --- | --- |
| Windows | コマンドプロンプトで `ipconfig` → `IPv4 アドレス` | 初回の「セキュリティの重要な警告」で、プライベートネットワークを許可 |
| macOS | ターミナルで `ipconfig getifaddr en0`（出なければ `en1`） | 初回の「着信を許可しますか」で許可。出なければ「システム設定 → ネットワーク → ファイアウォール」 |
| Linux | ターミナルで `hostname -I`（先頭の `192.168.` または `10.`） | `sudo ufw allow 3000/tcp`（ufw を使っている場合） |

IP は DHCP で変わることがある。繋がらなくなったら、もう一度この表で確認する。
`169.254.` で始まる番号は、LAN に繋がっていないときの仮のIPなので使わない。

---

## 6. 自分の研究に挿すとき

このシステムの役割は「LabVIEW から LLM を呼べる出口」である。
自分の計測VIの隣に、同梱の VI を置くイメージでよい。OSは問わない。

今のところ渡せるのは **文字列** である。

- 渡してよいもの: 患者役の感想、質問文、実験メモ（個人が特定できないもの）
- まだ渡さないもの: 氏名、カルテ番号、生のセンサー波形そのもの

センサー数値と会話を組み合わせるのは、今後の話である。
まずは「自分のLabVIEWから1回投げて、返信が返る」ところまで確認する。

よくある使い方:

| やりたいこと | 使うVI | 送るもの |
| --- | --- | --- |
| 感想を一文聞いて、励ましや注意を返す | `chat.vi` | 感想の文章 |
| 同じ感想を複数の視点で見たい | `multichat.vi` | 同じ感想の文章 |
| 自分の画面に組み込む | どちらかを複製 | URL と入力欄だけ自分のVIに出す |

AIの人格や数を変えたい場合は、柴尾または `lib/agents.ts` を触れる人に相談する。
LabVIEW側は `Agent ID`（`alpha` / `beta` / `gamma`）を変えるだけで切り替わる。

---

## 7. うまくいかないとき

上から順に見る。OS共通の項目と、OS固有の項目がある。

| 症状 | まず疑うこと | やること |
| --- | --- | --- |
| `docker` が認識されない | Docker が止まっている／入っていない | 節2をやり直し、クジラのアイコンか左下が緑になるまで待つ |
| Linux で permission denied | docker グループに入っていない | 節2の `usermod` のあと、ログアウトして入り直す |
| `.env.local` が無いと言われる | 名前が違う、または一段内側にいる | Windows は拡張子を表示。Mac は `Command + Shift + .`。`docker-compose.yml` と同じ階層か確認 |
| Mac で `.env.local` が見えない | ドットで始まるファイルは隠れる | Finder で `Command + Shift + .` |
| サーバー起動時に「APIキー未設定」 | `.env.local` が空、または場所が違う | リポジトリの一番上のフォルダに置く |
| ブラウザで `/api/lv/agents` が開かない | サーバーが止まっている／別PCから見ている | サーバーPCでは `localhost`、別PCでは IP を使う。同一LANかも確認 |
| LabVIEW の返信が空 / OK が光らない | URL の末尾に `/` がある、またはIPが違う | `http://<IP>:3000` ちょうどにする |
| 複数AIで途中で切れる | LabVIEW の待ち時間が短い | 既定は10秒。3体だと足りないことがある。タイムアウトを長くする（120000 ms） |
| `ok:false` で error が出る | キーの残高、入力が空、レート制限 | `error` の文言を読む。空送信していないか確認 |
| error が「LLM の利用上限に達しました」 | **残高切れ**、または短時間に送りすぎ | platform.openai.com の Billing で残高を見る。0ならクレジットを買う。残っていれば1分待って再送 |
| error が「LLM の呼び出しに失敗しました」 | キーの写し間違い・無効化されたキー、またはネット切れ | サーバーを起動した窓のログに `401` や `Incorrect API key` があればキーの問題。3-4 で作り直して `.env.local` に貼り直し、`docker compose up --build` |
| error が「OPENAI_API_KEY が設定されていません」 | `.env.local` が読めていない | 3-5 に戻る。場所・名前・`=` の右が空でないかを見る |
| 昨日まで繋がっていた | IP が変わった | 節5の表でもう一度 IP を確認する |
| Mac で Docker が重い／動かない | チップの種類を間違えて入れた | 「この Mac について」で Apple silicon か Intel かを見て入れ直す |
| 公式サイトの画面が、この文書と違う | サイトが更新された | 「画面が変わったとき」の文面を AI に貼る。キーの中身は貼らない |

LabVIEW の前に、必ずブラウザで `/api/lv/agents` を開く。
ここで失敗しているなら、VI ではなくサーバー側の問題である。

---

## 8. 止める・片付け

起動した窓で `Ctrl + C`（Mac も同じ）。
完全に止めるときは、同じフォルダでもう一度次を実行する。

```bash
docker compose down
```

`.env.local` は消さない。次に使うときにまた必要になる。
ZIP を消しても、キーだけ残しておけば同じ手順で戻せる。

---

## 9. 詳しく知りたい人へ

このマニュアルで足りないときだけ見る。

| ファイル | 内容 |
| --- | --- |
| `README.md` | 全体の説明と起動の要約 |
| `docs/lab_setup_guide.md` | サーバー設置の詳細 |
| `docs/labview_interface_spec.md` | LabVIEW とサーバーの間のJSONの約束 |
| `docs/system_architecture.md` | システム全体の図 |
| `labview/chat.vi` / `labview/multichat.vi` | 実際に開くVI |
