import { test, expect } from "./fixtures/workspace.js";

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 1200 },
});

async function touch(client, type, point) {
  await client.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: point ? [{ x: point.x, y: point.y }] : [],
  });
}
async function center(locator) {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("touch drag moves a task to a collapsed column and persists its status", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await page
    .locator(".column-in-process .column-toggle")
    .scrollIntoViewIfNeeded();
  const client = await page.context().newCDPSession(page);
  const start = await center(
    page.getByRole("button", { name: "Move Legacy task", exact: true }),
  );
  const end = await center(page.locator(".column-in-process .column-toggle"));
  await touch(client, "touchStart", start);
  await touch(client, "touchMove", { x: start.x, y: start.y + 20 });
  await touch(client, "touchMove", end);
  await expect(page.locator(".column-in-process")).toHaveClass(
    /is-drop-target/,
  );
  const restingScroll = await page
    .locator("main")
    .evaluate((element) => element.scrollTop);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(
    await page.locator("main").evaluate((element) => element.scrollTop),
  ).toBe(restingScroll);
  await touch(client, "touchEnd");
  await expect(page.locator(".column-in-process .task-card")).toContainText(
    "Legacy task",
  );
  await page.reload();
  await expect(page.locator(".column-in-process .task-card")).toContainText(
    "Legacy task",
  );
});

test("touch drag scrolls main near its edge; cancellation preserves the task", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  const handle = page.getByRole("button", {
    name: "Move Legacy task",
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  const before = await page
    .locator("main")
    .evaluate((element) => element.scrollTop);
  const client = await page.context().newCDPSession(page);
  await touch(client, "touchStart", await center(handle));
  await touch(client, "touchMove", { x: 180, y: 690 });
  await expect
    .poll(() => page.locator("main").evaluate((element) => element.scrollTop))
    .toBeGreaterThan(before);
  await touch(client, "touchCancel");
  await expect(page.locator(".kanban-drag-preview")).toHaveCount(0);
  await expect(page.locator(".column-pending .task-card")).toContainText(
    "Legacy task",
  );
});

test("kanban handle supports keyboard status changes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await page
    .getByRole("button", { name: "Move Legacy task", exact: true })
    .press("ArrowDown");
  await expect(page.locator(".column-completed .task-card")).toContainText(
    "Legacy task",
  );
});

test("Telegram form link opens the full editor in Inbox without creating a task until saved", async ({
  page,
}) => {
  await page.goto("/#new-task");
  const form = page.getByRole("dialog");
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Project", { exact: true })).toHaveValue(
    "inbox",
  );
  await form.getByLabel("Title", { exact: true }).fill("Task via form link");
  await form.getByLabel("Due date").fill("2026-12-01");
  await form.getByLabel("Priority", { exact: true }).selectOption("high");
  await form.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.locator(".dashboard-heading h1")).toHaveText("Inbox");
  await expect(page.locator(".task-card")).toContainText("Task via form link");
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".task-card")).toHaveCount(1);
});
