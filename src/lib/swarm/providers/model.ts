import type { ModelProvider } from "../types";

const LOCAL_OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const CLOUD_OLLAMA_URL = "https://ollama.com";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 300_000);
const CLOUD_MODEL = process.env.OLLAMA_CLOUD_MODEL ?? "glm-5.1:cloud";
const LOCAL_MODEL = process.env.OLLAMA_CODER_MODEL ?? "qwen2.5-coder:latest";

export class OllamaModelProvider implements ModelProvider {
  async generate(input: Parameters<ModelProvider["generate"]>[0]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
    const targets = await resolveOllamaTargets(input.model);
    const errors: string[] = [];

    try {
      for (const target of targets) {
        try {
          const response = await fetch(`${target.baseUrl}/api/generate`, {
            method: "POST",
            signal: controller.signal,
            headers: target.headers,
            body: JSON.stringify({
              model: target.model,
              stream: false,
              prompt: `${input.system}\n\n${input.prompt}`,
              options: {
                temperature: 0.25,
                num_predict: 900,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`${target.mode} ${target.model} returned ${response.status}`);
          }

          const data = (await response.json()) as { response?: string };
          const text = data.response?.trim();
          if (!text) {
            throw new Error(`${target.mode} ${target.model} returned an empty response`);
          }

          return { text, usedFallback: false, model: target.model };
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `${target.mode} ${target.model} failed`);
          if (controller.signal.aborted) {
            break;
          }
        }
      }

      return {
        text: fallbackFor(input.agent, input.prompt, errors),
        usedFallback: true,
        model: targets[0]?.model ?? LOCAL_MODEL,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

interface OllamaTarget {
  baseUrl: string;
  headers: Record<string, string>;
  model: string;
  mode: "local" | "cloud-api";
}

async function resolveOllamaTargets(requestedModel?: string): Promise<OllamaTarget[]> {
  const targets: OllamaTarget[] = [];

  if (process.env.OLLAMA_API_KEY) {
    targets.push({
      baseUrl: process.env.OLLAMA_CLOUD_URL ?? CLOUD_OLLAMA_URL,
      headers: {
        authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
        "content-type": "application/json",
      },
      model: directCloudModelName(requestedModel ?? process.env.OLLAMA_CLOUD_MODEL ?? "gpt-oss:120b"),
      mode: "cloud-api",
    });
  }

  const availableModels = await listLocalModels();
  const preferred =
    requestedModel ??
    process.env.OLLAMA_PLANNER_MODEL ??
    [CLOUD_MODEL, LOCAL_MODEL, "qwen2.5-coder:7b"].find((model) => availableModels.includes(model)) ??
    LOCAL_MODEL;

  targets.push({
    baseUrl: LOCAL_OLLAMA_URL,
    headers: { "content-type": "application/json" },
    model: preferred,
    mode: "local",
  });

  if (!targets.some((target) => target.mode === "local" && target.model === LOCAL_MODEL)) {
    targets.push({
      baseUrl: LOCAL_OLLAMA_URL,
      headers: { "content-type": "application/json" },
      model: LOCAL_MODEL,
      mode: "local",
    });
  }

  return targets;
}

function directCloudModelName(model: string) {
  return model.endsWith(":cloud") ? model.slice(0, -":cloud".length) : model;
}

async function listLocalModels() {
  try {
    const response = await fetch(`${LOCAL_OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
    return (data.models ?? []).flatMap((model) => [model.name, model.model].filter(Boolean) as string[]);
  } catch {
    return [];
  }
}

function fallbackFor(agent: string, prompt: string, errors: string[]) {
  return [
    `${agent} fallback output`,
    "",
    "Ollama could not complete the request after trying all configured targets.",
    ...errors.map((error) => `- ${error}`),
    "",
    "Direct Ollama cloud API model names usually omit the local `:cloud` suffix. The app now normalizes that and falls back to local Ollama when cloud API access is denied.",
    "",
    "Deterministic draft:",
    draftForPrompt(prompt),
  ].join("\n");
}

function draftForPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").slice(0, 380);
  return `Use the idea as the source of truth, keep scope small, generate a clean MVP, document assumptions, and preserve approval gates. Prompt context: ${compact}`;
}
