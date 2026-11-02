# LabVIEW 無料版（Community Edition）の入れ方 — 自分の PC 向け

**自分の PC で、個人の学習・お試しに LabVIEW を使う** ための手順。
2026-11 時点の NI の公式情報をもとに書いた。画面や名前は変わることがあるので、合わないときは最後の「手順どおりに進まないとき」を見る。

---

## 0. 使ってよい場面（必ず先に読む）

NI のライセンスの条件（公式ページ「[Community Edition Software Usage Details](https://www.ni.com/en/support/documentation/supplemental/20/labview-community-edition-usage-details.html)」）より。

| 場面 | 無料版を使えるか |
| --- | --- |
| **自分で持っている PC** で、個人の学習・趣味・お試しに使う | 使える |
| 学生が **自分の PC** で、授業の課題に使う | 使える |
| **大学の PC**（研究室の PC、先生の PC、控室のタワー PC、N100 ミニPC など）に入れる | **使えない**。大学・研究室のライセンスを使う |
| **研究**（卒業研究・論文・実験）に使う | **使えない**。自分の PC でも同じ |
| 授業を教える、仕事・アルバイト・お金になる用途 | 使えない |

迷ったら先生に確認する。条件は NI が変えることがあるので、入れる前に上の公式ページで今の条件を確かめる。

---

## 1. 先に知っておくこと

| 項目 | 内容 |
| --- | --- |
| 料金 | 無料 |
| 対応 OS | Windows、macOS（Apple チップの Mac も可） |
| アカウント | NI のアカウント（無料）が要る。ダウンロードと有効化に **同じアカウント** を使う |
| ネット | 有効化のときに必要。有効化した後はオフラインでも使える |
| 使える期間 | 有効化した日から **1年**。毎年、無料で更新する（節5） |
| 入れられる台数 | 1つのアカウントで3台まで入れられる。同時に動かせるのは1台だけ |
| 版 | 無料版は **その時点の最新版だけ** が配られている。古い版は選べない |
| 容量・時間 | 本体とドライバーで大きい。ディスクに十数 GB 以上の空きを用意し、ダウンロードとインストールに1時間ほどを見込む |

このリポジトリの VI（`labview/chat.vi`、`labview/multichat.vi`）は、新しい版の LabVIEW で開ける。
ただし、新しい版で保存し直すと古い版の LabVIEW では開けなくなる。研究室の PC と行き来するときは、研究室側の版に合わせて保存する（`File > Save for Previous Version`）。

---

## 2. NI のアカウントを作る（5分）

1. ブラウザで `ni.com` を開く。検索するなら「NI アカウント 作成」
2. 右上の人の形のアイコン → **Create Account**（アカウントを作成）
3. メールアドレスとパスワードを入れ、届いた確認メールのリンクを押す

このアカウントは、有効化と毎年の更新に使う。**どのメールアドレスで作ったかを控えておく。**
パスワードはこの文書にもリポジトリにも書かない。

---

## 3. ダウンロードする（5〜30分）

1. NI の「[LabVIEW Community のダウンロード](https://www.ni.com/en/support/downloads/software-products/download.labview-community.html)」のページを開く
   - 検索するなら「LabVIEW Community download」。`ni.com` のページであることを確かめる
2. 2で作ったアカウントでログインする（求められなければ右上からログイン）
3. 次を選ぶ
   - **Supported OS**: 自分の OS（Windows / macOS）
   - **Version**: 一番上（最新）
   - **Application Bitness**（Windows のみ）: **64-bit**。PC が 64 ビットなら普通はこれ。32-bit は古い部品を使うときだけ
   - **Language**: 日本語があれば日本語、無ければ英語
4. **Download** を押す。インストーラー（Windows は `.exe`、Mac は `.dmg`）が落ちてくる

ネットが不安定なら、同じページの **Install Offline** で一括のファイル（ISO など）を落とせる。
ただし、有効化にはどのみちネットが要る。

---

## 4. インストールして有効化する

### 4-1. Windows（30〜60分）

1. 落とした `.exe` を開く。「このアプリがデバイスに変更を加えることを許可しますか」は **はい**
2. 最初に **NI Package Manager**（NI のソフトを入れる道具）が入る。ライセンスに同意して **Next** を押していく
   - 「高速スタートアップを無効にする」の画面が出たら、そのまま **Next** でよい
3. 入れるものの一覧（Product List）が出る。**最初から選ばれているままで Next**
   - 追加の部品（Additional Packages）も、迷ったら初期のままでよい
4. ライセンスの画面で **I accept…** に印を付けて **Next**
5. **Next** を押すとインストールが始まる。終わるまで待つ（ネットの速さで30分〜1時間）
6. 「NI Update Service を有効にしますか」は、どちらでもよい。分からなければ **いいえ** でよい
7. 再起動を求められたら再起動する
8. **有効化:** LabVIEW を開くと、有効化を求める画面が出る
   - **Log in to Activate** を押し、**ダウンロードに使ったのと同じ NI アカウント** でログインする
   - 画面が出ないとき・失敗したとき: スタートメニューから **NI License Manager** を開く
     → **Activate Software** → 同じアカウントでログイン → **Check my account for licenses** → **Activate**
   - それでもだめなら: NI License Manager の **Local Licenses** → `LabVIEW Community` を探して右クリック → **Activate**

### 4-2. macOS（20〜40分）

1. 落とした `.dmg` を開き、中のインストーラーを実行する
2. 画面の指示どおりに進める。パスワード（Mac のログインのもの）を求められたら入れる
3. LabVIEW を開き、有効化の画面で **ダウンロードに使ったのと同じ NI アカウント** でログインする
4. 「開発元を確認できない」などで開けないときは、システム設定 → プライバシーとセキュリティ の下の方で **このまま開く** を押す

### 4-3. 入ったか確かめる

1. LabVIEW を開き、`Help > About LabVIEW`（ヘルプ → LabVIEW について）で、**Community Edition** と版が表示されることを確かめる
2. このリポジトリの `labview/chat.vi` を開く。開ければ VI は使える
3. サーバーにつなぐ手順は `docs/user_manual.md` の節5と同じ

---

## 5. 1年ごとの更新

有効化から1年たつと、LabVIEW が「ライセンスが切れた」と言って起動しなくなる。そのときは次のようにする。

1. ブラウザで LabVIEW Community のページ（節3のページ、または `ni.com` の自分のアカウントの画面）を開き、同じアカウントでログインする
2. **Renew Your License**（ライセンスを更新）を押す
   - 見つからないときは、節3の手順でもう一度 **Download** を押すだけで、新しい1年分が付くことがある（ダウンロードは途中で止めてよい）
3. PC で **NI License Manager** を開き、ログインした状態で **Check my account for licenses** を押す

アカウントが認識されないときは、NI の案内では、ネットワークの設定で IPv6 を切って IPv4 だけにすると通ることがある。

---

## 6. 手順どおりに進まないとき

NI のサイトや画面は、年に何度か変わる。そのときは次の順に当たる。

1. **最終的にできていればよい状態** を確かめる
   - LabVIEW が開き、`Help > About LabVIEW` に Community Edition と出る
   - `labview/chat.vi` が開ける
2. NI の公式の案内を見る（`ni.com` / `knowledge.ni.com` のページだけを信じる）
   - 入れ方: 「Activate NI Community Edition Software」「How to Install NI Software Using NI Package Manager」
   - 使ってよい場面: 「NI Community Edition Software Usage Details」
   - OS との対応: 「LabVIEW and Microsoft Windows Compatibility」「LabVIEW and macOS Compatibility」
3. AI に聞く。**今日の日付・OS・画面の文言をそのまま** 入れると、的外れになりにくい

```text
今日は 20XX年X月X日です。自分の Windows 11 の PC に、個人の学習用として
LabVIEW Community Edition を入れようとしています。
NI のサイトで「（画面に出ている文言をそのまま）」と表示されて先に進めません。
NI の公式の手順に沿って、次に何をすればよいか教えてください。
```

4. 非公式の配布サイトや、ライセンスを外すツールは使わない
5. 分かったことは、この文書を直すか、`docs/integration_notes.md` に1行足す
