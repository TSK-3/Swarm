"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  FileCode2,
  FlaskConical,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Approval, SwarmRun } from "@/lib/swarm/types";

const iconMap = {
  CoordinatorAgent: ShieldCheck,
  IntakeAgent: Play,
  ResearchAgent: Search,
  IdeationAgent: Clock,
  ProductSpecAgent: FileCode2,
  DesignAgent: FileCode2,
  FrontendAgent: FileCode2,
  BackendAgent: FileCode2,
  TestAgent: FlaskConical,
  ReviewerAgent: Check,
};

export default function Home() {
  const [idea, setIdea] = useState("");
  const [run, setRun] = useState<SwarmRun | null>(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!run?.id) return;

    const events = new EventSource(`/api/runs/${run.id}/events`);
    events.addEventListener("update", (message) => {
      setRun(JSON.parse((message as MessageEvent).data));
    });
    events.addEventListener("done", (message) => {
      setRun(JSON.parse((message as MessageEvent).data));
      events.close();
    });
    events.onerror = () => {
      events.close();
    };

    const interval = setInterval(async () => {
      const response = await fetch(`/api/runs/${run.id}`);
      if (response.ok) {
        const data = (await response.json()) as { run: SwarmRun };
        setRun(data.run);
      }
    }, 1500);

    return () => {
      events.close();
      clearInterval(interval);
    };
  }, [run?.id]);

  async function startRun() {
    setError("");
    setIsStarting(true);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not start run");
      }
      setRun(data.run);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start run");
    } finally {
      setIsStarting(false);
    }
  }

  async function resolve(approval: Approval, approve: boolean) {
    if (!run) return;
    const response = await fetch(`/api/runs/${run.id}/approvals/${approval.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve }),
    });
    const data = (await response.json()) as { run: SwarmRun };
    setRun(data.run);
  }

  const pendingApprovals = useMemo(
    () => run?.approvals.filter((approval) => approval.status === "pending") ?? [],
    [run],
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Local Agentic Swarm</h1>
          <p>Idea to research, design, guarded build, and test report with local agents.</p>
        </div>
        <span className="badge">Ollama local-first</span>
      </header>

      <section className="intake">
        <textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="Describe the app, tool, game, workflow, or product idea you want the swarm to build..."
        />
        <div className="intake-actions">
          <p className="muted">
            Approvals are required before generated files or execution gates are applied.
          </p>
          <button className="primary" onClick={startRun} disabled={isStarting || idea.trim().length < 5}>
            {isStarting ? "Starting..." : "Start swarm"}
          </button>
        </div>
        {error ? <p className="status failed">{error}</p> : null}
      </section>

      {run ? (
        <section className="grid">
          <div className="panel">
            <h2>Agents</h2>
            <div className="run-meta">
              <span className={`badge status ${run.status}`}>{run.status}</span>
              <span className="badge">{run.currentAgent ?? "Queued"}</span>
            </div>
            <div className="agent-list">
              {run.agents.map((agent) => {
                const Icon = iconMap[agent.name];
                return (
                  <article className="agent" key={agent.name}>
                    <div className="agent-header">
                      <strong>
                        <Icon size={15} /> {agent.name}
                      </strong>
                      <span className={`status ${agent.status}`}>{agent.status}</span>
                    </div>
                    <span className="muted">{agent.summary}</span>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <h2>Artifacts</h2>
            {run.artifacts.length === 0 ? <div className="empty">Artifacts will appear as agents finish.</div> : null}
            <div className="artifact-list">
              {run.artifacts.map((artifact) => (
                <article className="artifact" key={artifact.id}>
                  <div className="artifact-header">
                    <strong>{artifact.title}</strong>
                    <span className="status">{artifact.kind}</span>
                  </div>
                  <pre>{artifact.content}</pre>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Approvals</h2>
            {pendingApprovals.length === 0 ? <div className="empty">No pending approvals.</div> : null}
            <div className="approval-list">
              {pendingApprovals.map((approval) => (
                <article className="approval" key={approval.id}>
                  <div className="approval-header">
                    <strong>{approval.title}</strong>
                    <span className={`status ${approval.status}`}>{approval.kind}</span>
                  </div>
                  <p className="muted">{approval.description}</p>
                  <pre>{JSON.stringify(approval.payload, null, 2)}</pre>
                  <div className="approval-actions">
                    <button className="primary" onClick={() => resolve(approval, true)}>
                      <Check size={15} /> Approve
                    </button>
                    <button className="danger" onClick={() => resolve(approval, false)}>
                      <X size={15} /> Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <h2>Timeline</h2>
            <div className="event-list">
              {run.events
                .slice()
                .reverse()
                .map((event) => (
                  <article className="event" key={event.id}>
                    <div className="event-header">
                      <strong>{event.agent}</strong>
                      <span className={`status ${event.level}`}>{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <span className="muted">{event.message}</span>
                  </article>
                ))}
            </div>
          </div>
        </section>
      ) : null}

      {!run ? (
        <section className="panel">
          <h2>Local runtime</h2>
          <p className="muted">
            Install Ollama and pull `qwen2.5-coder` for real local generation. Without it, the swarm uses clearly
            labeled fallback drafts so the workflow remains testable.
          </p>
        </section>
      ) : null}
    </main>
  );
}
