import { NextResponse } from "next/server";
import { z } from "zod";
import { createRun } from "@/lib/swarm/engine";
import { listRuns } from "@/lib/swarm/store";

const createRunSchema = z.object({
  idea: z.string().min(5).max(4000),
});

export async function GET() {
  return NextResponse.json({ runs: await listRuns() });
}

export async function POST(request: Request) {
  const body = createRunSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Idea must be between 5 and 4000 characters." }, { status: 400 });
  }

  const run = await createRun(body.data.idea);
  return NextResponse.json({ run }, { status: 201 });
}
