import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SwarmRun } from "./types";

const runsDir = path.join(process.cwd(), ".swarm-runs");

async function ensureRunsDir() {
  await mkdir(runsDir, { recursive: true });
}

function runPath(id: string) {
  return path.join(runsDir, `${id}.json`);
}

export async function saveRun(run: SwarmRun) {
  await ensureRunsDir();
  const nextRun = { ...run, updatedAt: new Date().toISOString() };
  await writeFile(runPath(run.id), JSON.stringify(nextRun, null, 2), "utf8");
  return nextRun;
}

export async function getRun(id: string) {
  try {
    const raw = await readFile(runPath(id), "utf8");
    return JSON.parse(raw) as SwarmRun;
  } catch {
    return null;
  }
}

export async function listRuns() {
  await ensureRunsDir();
  const files = await readdir(runsDir);
  const runs = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => getRun(file.replace(/\.json$/, ""))),
  );
  return runs
    .filter((run): run is SwarmRun => Boolean(run))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
