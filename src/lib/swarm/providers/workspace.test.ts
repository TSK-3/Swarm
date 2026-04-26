import { describe, expect, it } from "vitest";
import { LocalWorkspaceProvider } from "./workspace";
import type { SwarmRun } from "../types";

describe("LocalWorkspaceProvider", () => {
  it("proposes a runnable Next.js app instead of a placeholder script", async () => {
    const provider = new LocalWorkspaceProvider();
    const files = await provider.proposePatch(fakeRun("Build a simple habit tracker app with login, dashboard, streaks, and weekly analytics."));

    expect(files.some((file) => file.path.endsWith("src/app/page.tsx"))).toBe(true);
    expect(files.some((file) => file.path.endsWith("src/index.js"))).toBe(false);

    const packageJson = files.find((file) => file.path.endsWith("package.json"));
    expect(packageJson?.content).toContain('"next"');
    expect(packageJson?.content).toContain('"react"');
    expect(packageJson?.path).toContain("generated-projects/build-a-simple-habit-tracker-app-with-login");

    const manifest = files.find((file) => file.path.endsWith("IDEA.md"));
    expect(manifest?.content).toContain("Build a simple habit tracker app");
    expect(manifest?.content).toContain("Habit Tracker");

    const page = files.find((file) => file.path.endsWith("src/app/page.tsx"));
    expect(page?.content).toContain("Habit Tracker");
    expect(page?.content).toContain("weekly analytics");
  });

  it("generates a clock app for live US and India time ideas", async () => {
    const provider = new LocalWorkspaceProvider();
    const files = await provider.proposePatch(fakeRun("Make an app that shows the live time in US and India with seconds"));

    const page = files.find((file) => file.path.endsWith("src/app/page.tsx"));
    expect(page?.content).toContain("World Clock");
    expect(page?.content).toContain("Asia/Kolkata");
    expect(page?.content).toContain("America/New_York");
    expect(page?.content).not.toContain("Habit Tracker");

    const readme = files.find((file) => file.path.endsWith("README.md"));
    expect(readme?.content).toContain("world clock app");
    expect(readme?.path).toContain("generated-projects/make-an-app-that-shows-the-live-time-in-us");
  });
});

function fakeRun(idea: string): SwarmRun {
  return {
    id: "test-run",
    idea,
    status: "running",
    agents: [],
    events: [],
    approvals: [],
    artifacts: [
      {
        id: "task-plan",
        kind: "task_plan",
        title: "Task Plan",
        content: "Build a habit tracker MVP.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "design",
        kind: "design",
        title: "Design",
        content: "Use a dashboard layout.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "architecture",
        kind: "architecture",
        title: "Architecture",
        content: "Use Next.js and localStorage.",
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
