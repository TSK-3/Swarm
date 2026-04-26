import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveApproval } from "@/lib/swarm/engine";

const approvalSchema = z.object({
  approve: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; approvalId: string }> },
) {
  const body = approvalSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Expected { approve: boolean }." }, { status: 400 });
  }

  const { id, approvalId } = await params;
  const run = await resolveApproval(id, approvalId, body.data.approve);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
