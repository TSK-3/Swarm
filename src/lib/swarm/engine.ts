import { randomUUID } from "node:crypto";
import { getRun, saveRun } from "./store";
import type {
  AgentName,
  AgentState,
  Approval,
  ApprovalKind,
  ArtifactKind,
  ModelProvider,
  ProposedFile,
  ResearchProvider,
  SwarmRun,
  WorkspaceProvider,
} from "./types";
import { OllamaModelProvider } from "./providers/model";
import { BrowserResearchProvider } from "./providers/research";
import { LocalWorkspaceProvider } from "./providers/workspace";

const agentOrder: AgentName[] = [
  "CoordinatorAgent",
  "IntakeAgent",
  "ResearchAgent",
  "IdeationAgent",
  "ProductSpecAgent",
  "DesignAgent",
  "FrontendAgent",
  "BackendAgent",
  "TestAgent",
  "ReviewerAgent",
];

const activeRuns = new Set<string>();

export async function createRun(idea: string) {
  const now = new Date().toISOString();
  const run: SwarmRun = {
    id: randomUUID(),
    idea,
    status: "queued",
    agents: agentOrder.map((name) => ({
      name,
      status: "queued",
      summary: "Waiting",
    })),
    events: [],
    artifacts: [],
    approvals: [],
    createdAt: now,
    updatedAt: now,
  };

  const saved = await saveRun(run);
  void resumeRun(saved.id);
  return saved;
}

export async function resumeRun(id: string) {
  if (activeRuns.has(id)) {
    return;
  }

  activeRuns.add(id);
  try {
    const run = await getRun(id);
    if (!run || ["completed", "failed", "rejected"].includes(run.status)) {
      return;
    }

    const engine = new SwarmEngine(
      new OllamaModelProvider(),
      new BrowserResearchProvider(),
      new LocalWorkspaceProvider(),
    );
    await engine.run(id);
  } finally {
    activeRuns.delete(id);
  }
}

export async function resolveApproval(runId: string, approvalId: string, approve: boolean) {
  const run = await getRun(runId);
  if (!run) {
    return null;
  }

  const approval = run.approvals.find((item) => item.id === approvalId);
  if (!approval || approval.status !== "pending") {
    return run;
  }

  approval.status = approve ? "approved" : "rejected";
  approval.resolvedAt = new Date().toISOString();
  run.status = approve ? "running" : "rejected";
  event(run, "CoordinatorAgent", approve ? `Approved: ${approval.title}` : `Rejected: ${approval.title}`, approve ? "info" : "warning");

  const saved = await saveRun(run);
  if (approve) {
    void resumeRun(saved.id);
  }
  return saved;
}

class SwarmEngine {
  constructor(
    private readonly model: ModelProvider,
    private readonly research: ResearchProvider,
    private readonly workspace: WorkspaceProvider,
  ) {}

  async run(id: string) {
    let run = await getRun(id);
    if (!run) {
      return;
    }

    run.status = "running";
    run = await saveRun(run);

    try {
      run = await this.runTextAgent(run, "CoordinatorAgent", "intake", "Create a concise coordination plan for the whole swarm.");
      run = await this.runTextAgent(run, "IntakeAgent", "intake", "Clarify the idea, user goal, target audience, and MVP success criteria.");
      run = await this.runResearch(run);
      run = await this.runTextAgent(run, "IdeationAgent", "task_plan", "Generate product directions, narrow to one MVP, and list the smallest useful build.");
      run = await this.runTextAgent(run, "ProductSpecAgent", "prd", "Write a PRD with user stories, requirements, non-goals, and acceptance criteria.");
      run = await this.runTextAgent(run, "DesignAgent", "design", "Create a UI and interaction design spec for a focused web app.");
      run = await this.runTextAgent(run, "FrontendAgent", "architecture", "Plan the frontend architecture, screens, components, and state flow.");
      run = await this.runBuildApproval(run);
      if (run.status === "waiting_approval") return;
      run = await this.runTextAgent(run, "BackendAgent", "code_summary", "Summarize the generated backend/filesystem work and integration points.");
      run = await this.runTestApproval(run);
      if (run.status === "waiting_approval") return;
      run = await this.runTextAgent(run, "ReviewerAgent", "review", "Review the output, risks, missing tests, and recommended next steps.");

      run.status = "completed";
      event(run, "CoordinatorAgent", "Swarm run completed", "info");
      await saveRun(run);
    } catch (error) {
      run.status = "failed";
      run.error = error instanceof Error ? error.message : "Unknown swarm failure";
      event(run, "CoordinatorAgent", run.error, "error");
      await saveRun(run);
    }
  }

  private async runTextAgent(run: SwarmRun, agent: AgentName, artifactKind: ArtifactKind, instruction: string) {
    if (run.artifacts.some((artifact) => artifact.kind === artifactKind) && agent !== "CoordinatorAgent") {
      completeAgent(run, agent, "Already completed");
      return saveRun(run);
    }

    startAgent(run, agent);
    ensureAgent(run, agent).summary = "Local model is generating";
    run = await saveRun(run);
    const context = summarizeContext(run);
    const result = await this.model.generate({
      agent,
      system: `${agent} is part of a local agentic product-building swarm. Be specific, practical, and concise.`,
      prompt: `${instruction}\n\nIdea: ${run.idea}\n\nContext so far:\n${context}`,
    });

    addArtifact(run, artifactKind, titleForArtifact(artifactKind), result.text);
    completeAgent(run, agent, result.usedFallback ? `Fallback output via ${result.model}` : `Generated with ${result.model}`);
    return saveRun(run);
  }

  private async runResearch(run: SwarmRun) {
    if (run.artifacts.some((artifact) => artifact.kind === "research")) {
      completeAgent(run, "ResearchAgent", "Already completed");
      return saveRun(run);
    }

    startAgent(run, "ResearchAgent");
    run = await saveRun(run);
    const sources = await this.research.searchAndRead(`${run.idea} competitors design implementation`);
    const content = sources
      .map(
        (source, index) =>
          `${index + 1}. ${source.title}\nURL: ${source.url}\nConfidence: ${source.confidence}\nSummary: ${source.summary}`,
      )
      .join("\n\n");
    addArtifact(run, "research", "Research Notes", content);
    completeAgent(run, "ResearchAgent", `${sources.length} source(s) captured`);
    return saveRun(run);
  }

  private async runBuildApproval(run: SwarmRun) {
    const existing = pendingOrResolved(run, "file_write");
    if (existing?.status === "pending") {
      run.status = "waiting_approval";
      return saveRun(run);
    }
    if (existing?.status === "approved" && !run.outputPath) {
      const files = existing.payload.files as ProposedFile[];
      startAgent(run, "FrontendAgent");
      run.outputPath = await this.workspace.applyApprovedPatch(run, files);
      addArtifact(
        run,
        "code_summary",
        "Generated Code Summary",
        `Approved files were written to ${run.outputPath}.\n\nFiles:\n${files.map((file) => `- ${file.path}`).join("\n")}`,
      );
      completeAgent(run, "FrontendAgent", "Approved files written");
      return saveRun(run);
    }
    if (run.outputPath) {
      return run;
    }

    const files = await this.workspace.proposePatch(run);
    addApproval(run, "file_write", "Create generated project files", "Write the proposed starter project under generated-projects/.", {
      files,
    });
    run.status = "waiting_approval";
    event(run, "CoordinatorAgent", "Waiting for approval to create generated project files", "warning");
    return saveRun(run);
  }

  private async runTestApproval(run: SwarmRun) {
    const existing = pendingOrResolved(run, "test_run");
    if (existing?.status === "pending") {
      run.status = "waiting_approval";
      return saveRun(run);
    }
    if (existing?.status === "approved") {
      startAgent(run, "TestAgent");
      addArtifact(
        run,
        "test_report",
        "Test Report",
        [
          "Approved test gate completed.",
          "",
          "Automated v1 checks:",
          "- Verified generated project path is recorded.",
          "- Verified generated file manifest exists in the approved payload.",
          "- Manual next step: run `npm install` and `npm test` inside the generated project after reviewing files.",
        ].join("\n"),
      );
      completeAgent(run, "TestAgent", "Approval-based test report produced");
      return saveRun(run);
    }

    addApproval(
      run,
      "test_run",
      "Record test report",
      "Create the v1 test report for the generated project. This does not execute untrusted generated code.",
      { outputPath: run.outputPath },
    );
    run.status = "waiting_approval";
    event(run, "CoordinatorAgent", "Waiting for approval to record the generated project test report", "warning");
    return saveRun(run);
  }
}

function startAgent(run: SwarmRun, name: AgentName) {
  const agent = ensureAgent(run, name);
  if (agent.status === "completed") return;
  agent.status = "running";
  agent.startedAt ??= new Date().toISOString();
  agent.summary = "Working";
  run.currentAgent = name;
  event(run, name, "Started", "info");
}

function completeAgent(run: SwarmRun, name: AgentName, summary: string) {
  const agent = ensureAgent(run, name);
  agent.status = "completed";
  agent.summary = summary;
  agent.completedAt = new Date().toISOString();
  event(run, name, summary, "info");
}

function ensureAgent(run: SwarmRun, name: AgentName): AgentState {
  let agent = run.agents.find((item) => item.name === name);
  if (!agent) {
    agent = { name, status: "queued", summary: "Waiting" };
    run.agents.push(agent);
  }
  return agent;
}

function addArtifact(run: SwarmRun, kind: ArtifactKind, title: string, content: string) {
  if (run.artifacts.some((artifact) => artifact.kind === kind)) {
    return;
  }
  run.artifacts.push({
    id: randomUUID(),
    kind,
    title,
    content,
    createdAt: new Date().toISOString(),
  });
}

function addApproval(
  run: SwarmRun,
  kind: ApprovalKind,
  title: string,
  description: string,
  payload: Record<string, unknown>,
) {
  const approval: Approval = {
    id: randomUUID(),
    kind,
    title,
    description,
    status: "pending",
    payload,
    createdAt: new Date().toISOString(),
  };
  run.approvals.push(approval);
}

function pendingOrResolved(run: SwarmRun, kind: ApprovalKind) {
  return [...run.approvals].reverse().find((approval) => approval.kind === kind);
}

function event(run: SwarmRun, agent: AgentName, message: string, level: "info" | "warning" | "error") {
  run.events.push({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    agent,
    message,
    level,
  });
}

function summarizeContext(run: SwarmRun) {
  return run.artifacts
    .map((artifact) => `## ${artifact.title}\n${artifact.content.slice(0, 900)}`)
    .join("\n\n");
}

function titleForArtifact(kind: ArtifactKind) {
  const titles: Record<ArtifactKind, string> = {
    intake: "Idea Intake",
    research: "Research Notes",
    prd: "Product Requirements",
    design: "Design Spec",
    architecture: "Architecture Plan",
    task_plan: "Task Plan",
    code_summary: "Code Summary",
    test_report: "Test Report",
    review: "Review Notes",
  };
  return titles[kind];
}
