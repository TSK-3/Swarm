import type { ResearchProvider, ResearchSource } from "../types";

export class BrowserResearchProvider implements ResearchProvider {
  async searchAndRead(query: string): Promise<ResearchSource[]> {
    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      const results = await page
        .locator("article, [data-testid='result'], .result")
        .evaluateAll((nodes) =>
          nodes.slice(0, 5).map((node) => {
            const anchor = node.querySelector("a");
            return {
              title: anchor?.textContent?.trim() || "Search result",
              url: anchor?.getAttribute("href") || "",
              summary: node.textContent?.replace(/\s+/g, " ").trim().slice(0, 320) || "",
            };
          }),
        );
      await browser.close();

      const sources = results
        .filter((result) => result.url)
        .map((result) => ({
          ...result,
          confidence: "medium" as const,
        }));

      if (sources.length > 0) {
        return sources;
      }
    } catch {
      return [
        {
          title: "Browser research unavailable",
          url: "local://research/browser-unavailable",
          summary:
            "Playwright could not complete a live search. The swarm continued with local reasoning and should treat claims as unverified.",
          confidence: "low",
        },
      ];
    }

    return [
      {
        title: "No public sources found",
        url: "local://research/no-results",
        summary:
          "The browser search did not return usable sources. Continue with caution and add user-provided sources for higher confidence.",
        confidence: "low",
      },
    ];
  }
}
