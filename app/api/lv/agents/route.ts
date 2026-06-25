import { NextResponse } from "next/server";
import { listAgents } from "@/lib/agents";

// LabVIEW 側でエージェント選択（ドロップダウン等）を作るための一覧取得。
// GET なので疎通確認（ヘルスチェック）も兼ねる。
export async function GET() {
  return NextResponse.json({ ok: true, agents: listAgents() });
}
