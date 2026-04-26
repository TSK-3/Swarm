import { NextResponse } from "next/server";
import { resumeRun } from "@/lib/swarm/engine";
import { getRun } from "@/lib/swarm/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (["queued", "running"].includes(run.status)) {
    void resumeRun(id);
  }
  return NextResponse.json({ run });
}
