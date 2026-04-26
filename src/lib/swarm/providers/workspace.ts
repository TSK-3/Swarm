import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProposedFile, SwarmRun, WorkspaceProvider } from "../types";

export class LocalWorkspaceProvider implements WorkspaceProvider {
  async proposePatch(run: SwarmRun): Promise<ProposedFile[]> {
    const safeName = run.id.replace(/[^a-zA-Z0-9_-]/g, "");
    const ideaSlug = slugifyIdea(run.idea);
    const folderName = `${ideaSlug}-${safeName.slice(0, 8)}`;
    const base = `generated-projects/${folderName}`;
    const taskPlan = artifact(run, "task_plan");
    const design = artifact(run, "design");
    const architecture = artifact(run, "architecture");
    const projectName = `swarm-generated-${safeName.slice(0, 8)}`;
    const blueprint = blueprintFor(run.idea);

    return [
      {
        path: `${base}/README.md`,
        operation: "create",
        content: [
          `# Generated Project for ${run.idea}`,
          "",
          "This repo was produced by the Local Agentic Swarm.",
          "",
          blueprint.description,
          "",
          "## Run Instructions",
          "",
          "```bash",
          "npm install",
          "npm run dev",
          "```",
          "",
          "## Implementation Plan",
          "",
          taskPlan || "No task plan artifact was available.",
          "",
          "## Known Limitations",
          "",
          ...blueprint.limitations,
          "- Review all generated code before running it.",
        ].join("\n"),
      },
      {
        path: `${base}/IDEA.md`,
        operation: "create",
        content: [
          "# Original Idea",
          "",
          run.idea.trim(),
          "",
          "## Generated Folder",
          "",
          folderName,
          "",
          "## Run Id",
          "",
          run.id,
          "",
          "## App Type",
          "",
          blueprint.title,
        ].join("\n"),
      },
      {
        path: `${base}/SPEC.md`,
        operation: "create",
        content: [
          "# Product And Architecture Spec",
          "",
          "## Design",
          "",
          design || "No design artifact was available.",
          "",
          "## Architecture",
          "",
          architecture || "No architecture artifact was available.",
        ].join("\n"),
      },
      {
        path: `${base}/package.json`,
        operation: "create",
        content: JSON.stringify(
          {
            name: projectName,
            version: "0.1.0",
            private: true,
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
              lint: "next lint",
            },
            dependencies: {
              "@next/env": "16.2.4",
              "lucide-react": "0.468.0",
              next: "16.2.4",
              react: "19.2.5",
              "react-dom": "19.2.5",
            },
            devDependencies: {
              "@types/node": "22.14.0",
              "@types/react": "19.2.14",
              "@types/react-dom": "19.2.3",
              eslint: "9.24.0",
              "eslint-config-next": "16.2.4",
              typescript: "5.8.3",
            },
          },
          null,
          2,
        ),
      },
      {
        path: `${base}/next.config.ts`,
        operation: "create",
        content: nextConfig(),
      },
      {
        path: `${base}/tsconfig.json`,
        operation: "create",
        content: tsConfig(),
      },
      {
        path: `${base}/next-env.d.ts`,
        operation: "create",
        content: nextEnv(),
      },
      {
        path: `${base}/src/app/layout.tsx`,
        operation: "create",
        content: appLayout(run.idea, blueprint.title),
      },
      {
        path: `${base}/src/app/page.tsx`,
        operation: "create",
        content: blueprint.page,
      },
      {
        path: `${base}/src/app/globals.css`,
        operation: "create",
        content: globalCss(),
      },
    ];
  }

  async applyApprovedPatch(run: SwarmRun, files: ProposedFile[]) {
    const generatedRoot = path.join(process.cwd(), "generated-projects");
    const firstPath = files.find((file) => file.path.startsWith("generated-projects/"))?.path;
    const folderName = firstPath?.split("/")[1] ?? `${slugifyIdea(run.idea)}-${run.id.slice(0, 8)}`;
    const outputPath = path.join(generatedRoot, folderName);

    for (const file of files) {
      if (!file.path.startsWith("generated-projects/")) {
        throw new Error(`Refusing to write outside generated-projects: ${file.path}`);
      }

      const relativePath = file.path.slice("generated-projects/".length);
      const absolute = path.resolve(generatedRoot, relativePath);
      if (!absolute.startsWith(generatedRoot)) {
        throw new Error(`Refusing unsafe generated path: ${file.path}`);
      }

      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content, "utf8");
    }

    return outputPath;
  }
}

function artifact(run: SwarmRun, kind: string) {
  return run.artifacts.find((item) => item.kind === kind)?.content;
}

function slugifyIdea(idea: string) {
  const slug = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42)
    .replace(/-+$/g, "");

  return slug || "generated-app";
}

function blueprintFor(idea: string) {
  const normalized = idea.toLowerCase();
  const isClock =
    /\b(clock|time|timezone|time zone|live time|seconds|india|us|usa|united states)\b/.test(normalized) &&
    !/\bhabit|streak|tracker\b/.test(normalized);
  const isHabit = /\bhabit|streak|routine|daily|tracker\b/.test(normalized);

  if (isClock) {
    return {
      title: "World Clock",
      description:
        "It is a runnable Next.js world clock app showing live time with seconds for India and multiple US time zones.",
      limitations: [
        "- Time is calculated in the browser with Intl.DateTimeFormat.",
        "- It does not require a backend or external time API.",
      ],
      page: worldClockPage(idea),
    };
  }

  if (isHabit) {
    return {
      title: "Habit Tracker",
      description:
        "It is a runnable Next.js app with a mock login, habit dashboard, streak tracking, weekly analytics, and browser-local persistence.",
      limitations: [
        "- Authentication is a local mock for prototyping.",
        "- Habit data is stored in browser localStorage.",
      ],
      page: habitTrackerPage(idea),
    };
  }

  return {
    title: "Generated App",
    description:
      "It is a runnable Next.js app tailored to the submitted idea, with a polished single-page experience and local interactivity.",
    limitations: ["- This generic template is used when the app type is not yet recognized."],
    page: genericGeneratedPage(idea),
  };
}

function nextConfig() {
  return [
    'import type { NextConfig } from "next";',
    "",
    "const nextConfig: NextConfig = {",
    "  reactStrictMode: true,",
    "};",
    "",
    "export default nextConfig;",
  ].join("\n");
}

function tsConfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "es2022"],
        allowJs: false,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  );
}

function nextEnv() {
  return [
    "/// <reference types=\"next\" />",
    "/// <reference types=\"next/image-types/global\" />",
    "",
    "// This file is generated by Next.js conventions.",
  ].join("\n");
}

function appLayout(idea: string, title: string) {
  return [
    'import type { Metadata } from "next";',
    'import "./globals.css";',
    "",
    "export const metadata: Metadata = {",
    `  title: ${JSON.stringify(title)},`,
    `  description: ${JSON.stringify(`Generated app for: ${idea.trim()}`)},`,
    "};",
    "",
    "export default function RootLayout({ children }: { children: React.ReactNode }) {",
    "  return (",
    '    <html lang="en">',
    "      <body>{children}</body>",
    "    </html>",
    "  );",
    "}",
  ].join("\n");
}

function worldClockPage(idea: string) {
  return `"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Globe2, Moon, RefreshCcw, Sun } from "lucide-react";

type Zone = {
  city: string;
  country: string;
  zone: string;
};

const zones: Zone[] = [
  { city: "India", country: "IST", zone: "Asia/Kolkata" },
  { city: "New York", country: "US Eastern", zone: "America/New_York" },
  { city: "Chicago", country: "US Central", zone: "America/Chicago" },
  { city: "Denver", country: "US Mountain", zone: "America/Denver" },
  { city: "Los Angeles", country: "US Pacific", zone: "America/Los_Angeles" },
];

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<"12h" | "24h">("12h");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(
    () =>
      zones.map((zone) => ({
        ...zone,
        time: formatTime(now, zone.zone, mode),
        date: formatDate(now, zone.zone),
        period: dayPeriod(now, zone.zone),
      })),
    [now, mode],
  );

  return (
    <main className="clock-shell">
      <header className="clock-hero">
        <span className="eyebrow"><Globe2 size={16} /> Live world clock</span>
        <h1>World Clock</h1>
        <p className="subtitle">India and US time with live seconds</p>
        <p>${escapeTemplate(idea.trim())}</p>
        <div className="toolbar">
          <button className={mode === "12h" ? "active" : ""} onClick={() => setMode("12h")}>12 hour</button>
          <button className={mode === "24h" ? "active" : ""} onClick={() => setMode("24h")}>24 hour</button>
          <button onClick={() => setNow(new Date())}><RefreshCcw size={16} /> Sync</button>
        </div>
      </header>

      <section className="clock-grid">
        {rows.map((row) => (
          <article className="clock-card" key={row.zone}>
            <div className="clock-card-top">
              <div>
                <span>{row.country}</span>
                <h2>{row.city}</h2>
              </div>
              {row.period === "day" ? <Sun size={24} /> : <Moon size={24} />}
            </div>
            <strong>{row.time}</strong>
            <p>{row.date}</p>
            <small>{row.zone}</small>
          </article>
        ))}
      </section>
    </main>
  );
}

function formatTime(date: Date, timeZone: string, mode: "12h" | "24h") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: mode === "12h",
  }).format(date);
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function dayPeriod(date: Date, timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );
  return hour >= 6 && hour < 18 ? "day" : "night";
}
`;
}

function habitTrackerPage(idea: string) {
  return `"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarCheck, Check, Flame, LogOut, Plus, ShieldCheck, Trash2 } from "lucide-react";

type Habit = {
  id: string;
  name: string;
  target: number;
  completions: Record<string, boolean>;
};

const storageKey = "swarm-habit-tracker-v1";
const today = new Date().toISOString().slice(0, 10);
const dayMs = 24 * 60 * 60 * 1000;

export default function Home() {
  const [user, setUser] = useState("");
  const [draftUser, setDraftUser] = useState("");
  const [draftHabit, setDraftHabit] = useState("");
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    const parsed = JSON.parse(saved) as { user: string; habits: Habit[] };
    setUser(parsed.user ?? "");
    setDraftUser(parsed.user ?? "");
    setHabits(parsed.habits ?? []);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ user, habits }));
  }, [user, habits]);

  const totalToday = habits.filter((habit) => habit.completions[today]).length;
  const bestStreak = Math.max(0, ...habits.map((habit) => streakFor(habit)));
  const week = useMemo(() => lastSevenDays(), []);

  function login(event: FormEvent) {
    event.preventDefault();
    if (!draftUser.trim()) return;
    setUser(draftUser.trim());
    if (habits.length === 0) {
      setHabits([
        createHabit("Morning walk", 5),
        createHabit("Drink water", 7),
        createHabit("Read 10 pages", 4),
      ]);
    }
  }

  function addHabit(event: FormEvent) {
    event.preventDefault();
    if (!draftHabit.trim()) return;
    setHabits((current) => [createHabit(draftHabit.trim(), 5), ...current]);
    setDraftHabit("");
  }

  function toggleHabit(id: string, date: string) {
    setHabits((current) =>
      current.map((habit) =>
        habit.id === id
          ? { ...habit, completions: { ...habit.completions, [date]: !habit.completions[date] } }
          : habit,
      ),
    );
  }

  function deleteHabit(id: string) {
    setHabits((current) => current.filter((habit) => habit.id !== id));
  }

  if (!user) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <div>
            <span className="eyebrow"><ShieldCheck size={16} /> Local mock login</span>
            <h1>Habit Tracker</h1>
            <p>${escapeTemplate(idea.trim())}</p>
          </div>
          <form onSubmit={login} className="login-form">
            <label htmlFor="name">Name</label>
            <input id="name" value={draftUser} onChange={(event) => setDraftUser(event.target.value)} placeholder="Your name" />
            <button type="submit">Enter dashboard</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <span className="eyebrow"><CalendarCheck size={16} /> Today is {formatDate(today)}</span>
          <h1>{user}'s habit dashboard</h1>
        </div>
        <button className="ghost" onClick={() => setUser("")}><LogOut size={17} /> Switch user</button>
      </header>

      <section className="metrics">
        <Metric icon={<Check />} label="Completed today" value={\`\${totalToday}/\${habits.length}\`} />
        <Metric icon={<Flame />} label="Best streak" value={\`\${bestStreak} days\`} />
        <Metric icon={<BarChart3 />} label="Weekly completion" value={\`\${weeklyCompletion(habits, week)}%\`} />
      </section>

      <section className="workbench">
        <div className="panel">
          <div className="panel-title">
            <h2>Habits</h2>
            <span>{habits.length} active</span>
          </div>
          <form className="habit-form" onSubmit={addHabit}>
            <input value={draftHabit} onChange={(event) => setDraftHabit(event.target.value)} placeholder="Add a new habit" />
            <button type="submit"><Plus size={17} /> Add</button>
          </form>
          <div className="habit-list">
            {habits.map((habit) => (
              <article className="habit" key={habit.id}>
                <div>
                  <strong>{habit.name}</strong>
                  <span>{streakFor(habit)} day streak</span>
                </div>
                <button className={habit.completions[today] ? "done" : ""} onClick={() => toggleHabit(habit.id, today)}>
                  <Check size={17} /> {habit.completions[today] ? "Done" : "Mark done"}
                </button>
                <button className="icon" aria-label={\`Delete \${habit.name}\`} onClick={() => deleteHabit(habit.id)}>
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <h2>Weekly analytics</h2>
            <span>Last 7 days</span>
          </div>
          <div className="week-grid">
            {week.map((date) => {
              const completed = habits.filter((habit) => habit.completions[date]).length;
              const percent = habits.length ? Math.round((completed / habits.length) * 100) : 0;
              return (
                <button className="day" key={date} onClick={() => habits[0] && toggleHabit(habits[0].id, date)}>
                  <span>{shortDay(date)}</span>
                  <div className="bar"><i style={{ height: \`\${percent}%\` }} /></div>
                  <strong>{percent}%</strong>
                </button>
              );
            })}
          </div>
          <p className="hint">Click any day to toggle the first habit for quick demo data.</p>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}

function createHabit(name: string, target: number): Habit {
  return { id: crypto.randomUUID(), name, target, completions: {} };
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * dayMs);
    return date.toISOString().slice(0, 10);
  });
}

function streakFor(habit: Habit) {
  let streak = 0;
  for (let index = 0; index < 90; index += 1) {
    const date = new Date(Date.now() - index * dayMs).toISOString().slice(0, 10);
    if (!habit.completions[date]) break;
    streak += 1;
  }
  return streak;
}

function weeklyCompletion(habits: Habit[], week: string[]) {
  if (habits.length === 0) return 0;
  const completed = week.reduce((count, date) => count + habits.filter((habit) => habit.completions[date]).length, 0);
  return Math.round((completed / (habits.length * week.length)) * 100);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

function shortDay(date: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(date));
}
`;
}

function genericGeneratedPage(idea: string) {
  return `"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

const steps = ["Define the core user", "Ship the first workflow", "Measure what matters"];

export default function Home() {
  return (
    <main className="generic-shell">
      <section className="generic-hero">
        <span className="eyebrow"><Sparkles size={16} /> Generated concept</span>
        <h1>Generated App</h1>
        <p>${escapeTemplate(idea.trim())}</p>
      </section>
      <section className="generic-list">
        {steps.map((step) => (
          <article key={step}>
            <CheckCircle2 size={20} />
            <span>{step}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
`;
}

function escapeTemplate(value: string) {
  return value.replace(/[`$\\]/g, "\\$&");
}

function globalCss() {
  return `:root {
  color-scheme: dark;
  --bg: #101214;
  --panel: #181c20;
  --panel-2: #20262b;
  --text: #f4f7f8;
  --muted: #aab4be;
  --line: #333b43;
  --accent: #4fc3a1;
  --accent-2: #79dcbb;
  --danger: #ff7676;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input {
  font: inherit;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-2);
  color: var(--text);
  min-height: 42px;
  padding: 0 14px;
  cursor: pointer;
}

button:hover {
  border-color: var(--accent);
}

input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #0d0f11;
  color: var(--text);
  min-height: 44px;
  padding: 0 12px;
}

.login-screen,
.dashboard,
.clock-shell,
.generic-shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
}

.login-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
}

.login-panel {
  width: min(560px, 100%);
  display: grid;
  gap: 28px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 28px;
}

.login-panel h1,
.topbar h1 {
  margin: 8px 0;
  font-size: clamp(34px, 6vw, 64px);
  line-height: 1;
  letter-spacing: 0;
}

.login-panel p,
.metric p,
.hint,
.panel-title span,
.habit span {
  color: var(--muted);
}

.login-form {
  display: grid;
  gap: 12px;
}

.login-form button,
.habit-form button,
.done {
  border-color: var(--accent);
  background: var(--accent);
  color: #082019;
  font-weight: 800;
}

.dashboard {
  display: grid;
  gap: 18px;
  padding: 28px 0 48px;
}

.clock-shell,
.generic-shell {
  display: grid;
  gap: 18px;
  padding: 36px 0 48px;
}

.topbar,
.panel-title,
.habit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.ghost {
  background: transparent;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-2);
  font-weight: 700;
}

.clock-hero,
.generic-hero {
  display: grid;
  gap: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 24px;
}

.clock-hero h1,
.generic-hero h1 {
  margin: 0;
  font-size: clamp(42px, 8vw, 92px);
  line-height: 0.95;
  letter-spacing: 0;
}

.clock-hero p,
.generic-hero p {
  margin: 0;
  color: var(--muted);
  font-size: 20px;
}

.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar .active {
  border-color: var(--accent);
  background: var(--accent);
  color: #082019;
  font-weight: 800;
}

.clock-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.clock-card {
  display: grid;
  gap: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 18px;
}

.clock-card-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
  color: var(--accent-2);
}

.clock-card h2 {
  margin: 4px 0 0;
  font-size: 26px;
}

.clock-card strong {
  font-size: clamp(36px, 7vw, 72px);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.clock-card p,
.clock-card small {
  margin: 0;
  color: var(--muted);
}

.generic-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.generic-list article {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 16px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.metric,
.panel,
.habit {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}

.metric {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px;
}

.metric > span {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(79, 195, 161, 0.12);
  color: var(--accent);
}

.metric strong {
  font-size: 28px;
}

.metric p {
  margin: 2px 0 0;
}

.workbench {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 14px;
  align-items: start;
}

.panel {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.panel h2 {
  margin: 0;
}

.habit-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.habit-list {
  display: grid;
  gap: 10px;
}

.habit {
  padding: 12px;
}

.habit strong {
  display: block;
}

.icon {
  width: 42px;
  padding: 0;
  color: var(--danger);
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.day {
  min-height: 180px;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px 6px;
}

.bar {
  display: flex;
  align-items: end;
  width: 18px;
  height: 88px;
  border-radius: 999px;
  background: #0d0f11;
  overflow: hidden;
}

.bar i {
  display: block;
  width: 100%;
  min-height: 4px;
  background: var(--accent);
}

@media (max-width: 820px) {
  .metrics,
  .workbench,
  .clock-grid,
  .generic-list {
    grid-template-columns: 1fr;
  }

  .topbar {
    align-items: start;
    flex-direction: column;
  }

  .week-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;
}
