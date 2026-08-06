#!/usr/bin/env bash
# 中間発表用デモ動画の編集ヘルパー
# 使い方は  bash scripts/make_demo_video.sh help
set -euo pipefail

die() { echo "エラー: $*" >&2; exit 1; }

command -v ffmpeg >/dev/null 2>&1 || die "ffmpeg が見つかりません。'brew install ffmpeg' で入れてください。"

# PowerPoint(Windows含む)で確実に再生できる設定
VCODEC=(-c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 23 -movflags +faststart)

usage() {
  cat <<'EOF'
中間発表用デモ動画の編集ヘルパー

  convert  <入力> <出力.mp4>
      PowerPoint用のmp4(H.264)に変換する。.mov は必ずこれを通すこと。

  trim     <入力> <出力.mp4> <開始秒> <長さ秒>
      いらない部分を切る。例: trim in.mov out.mp4 3 30
      → 3秒地点から30秒間を切り出す。

  speed    <入力> <出力.mp4> <倍率>
      早送りする。例: speed in.mp4 out.mp4 4  → 4倍速
      Dockerのビルドログなど、長い待ち時間の圧縮に使う。

  side     <左の動画> <右の動画> <出力.mp4> [右のずらし秒]
      2つの動画を横に並べる。プランB(2台同時録画)用。
      ずらし秒は右側の開始をずらして時刻を合わせる値。省略時は0。
      例: side labview.mp4 server.mov out.mp4 1.5

  compress <入力> <出力.mp4>
      画質をやや落としてファイルサイズを小さくする。20MBを超えるときに使う。

  info     <入力>
      長さ・解像度・ファイルサイズを表示する。

  shot     <入力> <出力.png> <秒>
      指定秒の静止画を切り出す。動画が再生できないとき用の保険画像に使う。
EOF
}

info() {
  local f="$1"; [ -f "$f" ] || die "ファイルがありません: $f"
  echo "ファイル : $f"
  echo "サイズ   : $(du -h "$f" | cut -f1)"
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,r_frame_rate \
    -show_entries format=duration \
    -of default=noprint_wrappers=1 "$f"
}

cmd="${1:-help}"
case "$cmd" in
  help|-h|--help) usage ;;

  convert)
    [ $# -eq 3 ] || die "使い方: convert <入力> <出力.mp4>"
    ffmpeg -y -i "$2" "${VCODEC[@]}" -an "$3"
    echo "完了: $3"; info "$3" ;;

  trim)
    [ $# -eq 5 ] || die "使い方: trim <入力> <出力.mp4> <開始秒> <長さ秒>"
    ffmpeg -y -ss "$4" -i "$2" -t "$5" "${VCODEC[@]}" -an "$3"
    echo "完了: $3"; info "$3" ;;

  speed)
    [ $# -eq 4 ] || die "使い方: speed <入力> <出力.mp4> <倍率>"
    ffmpeg -y -i "$2" -filter:v "setpts=PTS/$4" "${VCODEC[@]}" -an "$3"
    echo "完了: $3"; info "$3" ;;

  side)
    [ $# -ge 4 ] || die "使い方: side <左> <右> <出力.mp4> [右のずらし秒]"
    local_offset="${5:-0}"
    # 高さを1080に揃えてから横に連結する
    ffmpeg -y -i "$2" -ss "$local_offset" -i "$3" -filter_complex \
      "[0:v]scale=-2:1080,setsar=1[l];[1:v]scale=-2:1080,setsar=1[r];[l][r]hstack=inputs=2[v]" \
      -map "[v]" "${VCODEC[@]}" -an "$4"
    echo "完了: $4"
    echo "※ 左右の時刻がずれていたら、最後の数字を変えて撮り直さずに再実行してください。"
    info "$4" ;;

  compress)
    [ $# -eq 3 ] || die "使い方: compress <入力> <出力.mp4>"
    ffmpeg -y -i "$2" -c:v libx264 -profile:v high -pix_fmt yuv420p \
      -preset slow -crf 30 -vf "scale=-2:min(1080\,ih)" -movflags +faststart -an "$3"
    echo "完了: $3"; info "$3" ;;

  info)
    [ $# -eq 2 ] || die "使い方: info <入力>"
    info "$2" ;;

  shot)
    [ $# -eq 4 ] || die "使い方: shot <入力> <出力.png> <秒>"
    ffmpeg -y -ss "$4" -i "$2" -vframes 1 "$3"
    echo "完了: $3" ;;

  *) die "不明なコマンド: $cmd  （bash scripts/make_demo_video.sh help で一覧）" ;;
esac
