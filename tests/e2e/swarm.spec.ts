import { expect, test } from "@playwright/test";

test("starts a swarm run and shows approval queue", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/Describe the app/).fill("Build a tiny local kanban app for solo founders");
  await page.getByRole("button", { name: "Start swarm" }).click();
  await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Artifacts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approvals" })).toBeVisible();
  await expect(page.getByText("Create generated project files", { exact: true })).toBeVisible({ timeout: 30_000 });
});
