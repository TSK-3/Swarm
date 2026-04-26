import { describe, expect, it, vi } from "vitest";
import { createRun, resolveApproval } from "./engine";
import { getRun } from "./store";

vi.mock("./providers/research", () => ({
  BrowserResearchProvider: class {
    async searchAndRead() {
      return [
        {
          title: "Source",
          url: "https://example.com",
          summary: "Example source",
          confidence: "medium",
        },
      ];
    }
  },
}));

vi.mock("./providers/model", () => ({
  OllamaModelProvider: class {
    async generate(input: { agent: string }) {
      return {
        text: `${input.agent} output`,
        usedFallback: false,
        model: "mock-model",
      };
    }
  },
}));

describe("swarm engine", () => {
  it("pauses for file write approval and resumes after approval", async () => {
    const run = await createRun("Build a tiny habit tracker");
    await waitFor(async () => {
      const current = await getRun(run.id);
      return current?.status === "waiting_approval";
    });

    const waiting = await getRun(run.id);
    expect(waiting?.approvals.some((approval) => approval.kind === "file_write")).toBe(true);

    const approval = waiting?.approvals.find((item) => item.kind === "file_write");
    expect(approval).toBeTruthy();

    await resolveApproval(run.id, approval!.id, true);
    await waitFor(async () => {
      const current = await getRun(run.id);
      return current?.approvals.some((item) => item.kind === "test_run" && item.status === "pending") ?? false;
    });

    const afterBuild = await getRun(run.id);
    expect(afterBuild?.outputPath).toContain("generated-projects");
  });

  it("marks a run rejected when an approval is rejected", async () => {
    const run = await createRun("Build a tiny notes app");
    await waitFor(async () => {
      const current = await getRun(run.id);
      return current?.status === "waiting_approval";
    });

    const waiting = await getRun(run.id);
    const approval = waiting?.approvals.find((item) => item.status === "pending");
    await resolveApproval(run.id, approval!.id, false);

    const rejected = await getRun(run.id);
    expect(rejected?.status).toBe("rejected");
  });
});

async function waitFor(predicate: () => Promise<boolean>) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 3000) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for condition");
}
