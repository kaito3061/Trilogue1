#!/usr/bin/env python3
"""LabVIEW実装前の往復検証スクリプト。

LabVIEW の HTTP Client VI でやろうとしている処理（POST → JSON解析）を
Python で先に再現し、サーバーとの往復が成立しているかを確認する。

これが緑（PASS）になれば「あとは LV で同じ HTTP POST を組むだけ」と
切り分けられる。標準ライブラリのみ使用（pip 不要）。

使い方:
    python3 scripts/lv_roundtrip_check.py
    python3 scripts/lv_roundtrip_check.py --base-url http://localhost:3000 --agent beta
    python3 scripts/lv_roundtrip_check.py --multi-agents alpha,beta,gamma
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request


def http_get(url: str, timeout: float) -> dict:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def http_post_json(url: str, payload: dict, timeout: float) -> dict:
    # LV の Add Header(Content-Type: application/json) + POST(buffer=JSON) に相当
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Trilogue LV往復検証")
    parser.add_argument("--base-url", default="http://localhost:3000")
    parser.add_argument("--agent", default="alpha")
    parser.add_argument("--text", default="接続テストです。短く挨拶してください。")
    parser.add_argument("--timeout", type=float, default=120.0)
    parser.add_argument(
        "--multi-agents",
        default="alpha,beta",
        help="段階B(/api/lv/multi)で発言させるエージェントIDをカンマ区切りで指定",
    )
    args = parser.parse_args()

    agents_url = f"{args.base_url}/api/lv/agents"
    chat_url = f"{args.base_url}/api/lv/chat"
    multi_url = f"{args.base_url}/api/lv/multi"
    failures = 0

    # 1) 疎通確認（GET /api/lv/agents） = サーバーが起きているか
    print(f"[1] GET  {agents_url}")
    try:
        agents = http_get(agents_url, args.timeout)
        if agents.get("ok") and isinstance(agents.get("agents"), list):
            ids = [a.get("id") for a in agents["agents"]]
            print(f"    PASS  agents={ids}")
        else:
            print(f"    FAIL  unexpected body: {agents}")
            failures += 1
    except urllib.error.URLError as e:
        print(f"    FAIL  サーバーに接続できません: {e}")
        print("    → 別ターミナルで `npm run dev` を起動してから再実行してください。")
        return 1

    # 2) 異常系（text 空）= ok:false が返るか
    print(f"[2] POST {chat_url}  (text='' → ok:false 期待)")
    try:
        res = http_post_json(chat_url, {"text": ""}, args.timeout)
        if res.get("ok") is False and res.get("error"):
            print(f"    PASS  error='{res['error']}'")
        else:
            print(f"    FAIL  ok:false を期待: {res}")
            failures += 1
    except urllib.error.URLError as e:
        print(f"    FAIL  {e}")
        failures += 1

    # 3) 正常系（実際の往復）= reply が返るか
    print(f"[3] POST {chat_url}  (agent={args.agent})")
    try:
        res = http_post_json(
            chat_url, {"text": args.text, "agentId": args.agent}, args.timeout
        )
        if res.get("ok") and res.get("reply"):
            print(f"    PASS  agent={res.get('agentName')} model={res.get('model')}")
            print(f"          reply: {res['reply']}")
        else:
            print(f"    FAIL  reply が空 or ok:false: {res}")
            failures += 1
    except urllib.error.URLError as e:
        print(f"    FAIL  {e}")
        failures += 1

    # 4) 段階B（複数AIの一括応答）= turns がまとまって返るか
    multi_agents = [a.strip() for a in args.multi_agents.split(",") if a.strip()]
    print(f"[4] POST {multi_url}  (agentIds={multi_agents})")
    try:
        started = time.monotonic()
        res = http_post_json(
            multi_url, {"text": args.text, "agentIds": multi_agents}, args.timeout
        )
        elapsed = time.monotonic() - started
        turns = res.get("turns")
        if res.get("ok") and isinstance(turns, list) and len(turns) == len(multi_agents):
            order = [f"{t.get('order')}:{t.get('agentName')}" for t in turns]
            print(f"    PASS  {len(turns)}発言 order={order} 所要={elapsed:.1f}秒")
            for turn in turns:
                print(f"          {turn.get('agentName')}: {turn.get('reply')}")
            # LV の POST は既定タイムアウト 10 秒。実測値を見せて設定漏れを防ぐ。
            if elapsed > 9:
                print(
                    f"    NOTE  {elapsed:.1f}秒かかりました。LabVIEW の POST は既定 10 秒で"
                    "タイムアウトするため、timeout (ms) を 120000 などに伸ばしてください。"
                )
        else:
            print(f"    FAIL  ok:true と {len(multi_agents)}件の turns を期待: {res}")
            failures += 1
    except urllib.error.URLError as e:
        print(f"    FAIL  {e}")
        failures += 1

    print("-" * 48)
    if failures == 0:
        print("RESULT: ALL PASS  → LV で同じ POST を組めば往復します。")
        return 0
    print(f"RESULT: {failures} 件 FAIL")
    return 1


if __name__ == "__main__":
    sys.exit(main())
