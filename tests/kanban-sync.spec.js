import { test, expect } from "@playwright/test";
import { base, login, addTask } from "./fixtures/remote.js";

for (const rejected of [false, true]) {
  test(`kanban moves immediately while the server is pending and ${rejected ? "rolls back a rejection" : "confirms success"}`, async ({
    page,
    request,
  }) => {
    await login(page, rejected ? 9802 : 9801, request);
    await addTask(page, "Slow server task");
    await page.getByRole("button", { name: "Kanban", exact: true }).click();
    const handle = page.getByRole("button", {
      name: "Move Slow server task",
      exact: true,
    });
    await expect(handle).toBeVisible();
    const completedToggle = page.locator(".column-completed .column-toggle");
    await completedToggle.click();
    await completedToggle.click();
    let release;
    const responseGate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/api/workspace", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await responseGate;
      if (rejected)
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Test save rejected" }),
        });
      return route.continue();
    });
    try {
      await handle.press("ArrowDown");
      const card = page.locator(".column-completed .task-card");
      await expect(card).toContainText("Slow server task");
      await expect(card).toHaveAttribute("aria-busy", "true");
      await expect(card.getByRole("status")).toHaveText("Saving…");
      await expect(page.locator(".column-pending .task-card")).toHaveCount(0);
      await expect(
        card.getByRole("button", { name: "Edit", exact: true }),
      ).toBeDisabled();
      release();
      await expect(page.locator(".task-card[aria-busy=true]")).toHaveCount(0);
      await expect(page.locator(".task-card")).toHaveCount(1);
      await expect(
        page.locator(
          `.column-${rejected ? "pending" : "completed"} .task-card`,
        ),
      ).toContainText("Slow server task");
      if (rejected)
        await expect(
          page
            .getByRole("alert")
            .filter({ hasText: "Changes could not be saved:" }),
        ).toContainText("Test save rejected");
      const remote = await (
        await page.request.get(base + "/api/workspace")
      ).json();
      expect(
        remote.snapshot.projects.flatMap((project) => project.todoList)[0]
          .task_status,
      ).toBe(rejected ? "pending" : "completed");
    } finally {
      release();
    }
  });
}
