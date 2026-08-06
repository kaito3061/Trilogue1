#!/usr/bin/env bash
# docs/system_architecture.md 内の Mermaid 図を、スライドに耐える解像度で画像化する。
# 出力: docs/export/fig_asis.png, docs/export/fig_tobe.png
#
#   bash scripts/render_figures.sh
#
# 注意: ロードマップ図（3つ目の timeline）は日本語のラベルが重なって崩れるため、
#       画像化せず scripts/build_midterm_pptx.py 内で図形として描いている。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/system_architecture.md"
OUT="$ROOT/docs/export"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"

python3 - "$SRC" "$TMP" <<'PY'
import re, sys, os
src, tmp = sys.argv[1], sys.argv[2]
blocks = re.findall(r'```mermaid\n(.*?)\n```', open(src, encoding='utf-8').read(), re.S)
for i, b in enumerate(blocks, 1):
    open(os.path.join(tmp, f'd{i}.mmd'), 'w', encoding='utf-8').write(b)
print(f'{len(blocks)} 個の図を抽出しました')
PY

cat > "$TMP/cfg.json" <<'EOF'
{"theme":"neutral","themeVariables":{"fontFamily":"Hiragino Sans, Yu Gothic, sans-serif","fontSize":"16px"},"flowchart":{"htmlLabels":true,"nodeSpacing":45,"rankSpacing":55}}
EOF

render() {  # render <番号> <出力名>
  npx --yes @mermaid-js/mermaid-cli \
    -i "$TMP/d$1.mmd" -o "$OUT/$2" -c "$TMP/cfg.json" -b white -s 4 -w 1600
  echo "  → $OUT/$2"
}

render 1 fig_asis.png   # 現在の構成（As-Is）
render 2 fig_tobe.png   # 将来構成（To-Be）

echo "完了。スライドを作り直すには: python3 scripts/build_midterm_pptx.py"
