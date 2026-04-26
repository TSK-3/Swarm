export type RunStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "rejected";

export type AgentStatus = "queued" | "running" | "completed" | "failed" | "skipped";

export type ApprovalKind =
  | "file_write"
  | "dependency_install"
  | "code_execution"
  | "test_run"
  | "file_delete";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ArtifactKind =
  | "intake"
  | "research"
  | "prd"
  | "design"
  | "architecture"
  | "task_plan"
  | "code_summary"
  | "test_report"
  | "review";

export type AgentName =
  | "IntakeAgent"
  | "ResearchAgent"
  | "IdeationAgent"
  | "ProductSpecAgent"
  | "DesignAgent"
  | "FrontendAgent"
  | "BackendAgent"
  | "TestAgent"
  | "ReviewerAgent"
  | "CoordinatorAgent";

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  summary: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SwarmEvent {
  id: string;
  timestamp: string;
  agent: AgentName;
  message: string;
  level: "info" | "warning" | "error";
}

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  kind: ApprovalKind;
  title: string;
  description: string;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  resolvedAt?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  summary: string;
  confidence: "low" | "medium" | "high";
}

export interface ProposedFile {
  path: string;
  content: string;
  operation: "create" | "edit";
}

export interface SwarmRun {
  id: string;
  idea: string;
  status: RunStatus;
  currentAgent?: AgentName;
  agents: AgentState[];
  events: SwarmEvent[];
  artifacts: Artifact[];
  approvals: Approval[];
  createdAt: string;
  updatedAt: string;
  outputPath?: string;
  error?: string;
}

export interface ModelProvider {
  generate(input: {
    agent: AgentName;
    system: string;
    prompt: string;
    model?: string;
  }): Promise<{ text: string; usedFallback: boolean; model: string }>;
}

export interface ResearchProvider {
  searchAndRead(query: string): Promise<ResearchSource[]>;
}

export interface WorkspaceProvider {
  proposePatch(run: SwarmRun): Promise<ProposedFile[]>;
  applyApprovedPatch(run: SwarmRun, files: ProposedFile[]): Promise<string>;
}
