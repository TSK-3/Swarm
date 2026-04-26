import { resumeRun } from "@/lib/swarm/engine";
import { getRun } from "@/lib/swarm/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encoder = new TextEncoder();
  let lastEventCount = 0;
  let closed = false;
  let timer: ReturnType<typeof setInterval>;

  void resumeRun(id);

  function send(controller: ReadableStreamDefaultController, payload: string) {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(payload));
    } catch {
      closed = true;
      clearInterval(timer);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      timer = setInterval(async () => {
        const run = await getRun(id);
        if (!run) {
          send(controller, "event: error\ndata: {\"error\":\"Run not found\"}\n\n");
          clearInterval(timer);
          if (!closed) controller.close();
          closed = true;
          return;
        }

        if (run.events.length !== lastEventCount) {
          lastEventCount = run.events.length;
          send(controller, `event: update\ndata: ${JSON.stringify(run)}\n\n`);
        }

        if (["completed", "failed", "rejected"].includes(run.status)) {
          clearInterval(timer);
          send(controller, `event: done\ndata: ${JSON.stringify(run)}\n\n`);
          if (!closed) controller.close();
          closed = true;
        }
      }, 1000);
    },
    cancel() {
      closed = true;
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
