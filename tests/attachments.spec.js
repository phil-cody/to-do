import { test, expect } from "./fixtures/workspace.js";
import { test as remoteTest } from "@playwright/test";
import { login, base } from "./fixtures/remote.js";

async function createWithFile(page) {
  await page.getByRole("button", { name: "+ Add Task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("With attachment");
  await page.locator('dialog input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("private attachment"),
  });
  await expect(
    page.getByRole("button", { name: "Remove notes.txt", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function openDetail(page) {
  await page
    .locator(".task-card")
    .filter({
      has: page.getByRole("heading", { name: "With attachment", exact: true }),
    })
    .getByRole("button", { name: "Show more" })
    .click();
}
async function downloadFile(page) {
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download notes.txt", exact: true })
    .click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("notes.txt");
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toBe("private attachment");
}
test("local attachments survive reload, download and removal", async ({
  page,
}) => {
  await page.goto("/");
  await createWithFile(page);
  await page.reload();
  await openDetail(page);
  await downloadFile(page);
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByRole("button", { name: "Remove notes.txt" }).click();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.reload();
  await openDetail(page);
  await expect(
    page.getByRole("button", { name: "Download notes.txt" }),
  ).toHaveCount(0);
});
remoteTest(
  "remote attachment is downloadable on a second device; offline file edit survives reload and sync",
  async ({ browser, request }) => {
    const first = await browser.newContext(),
      second = await browser.newContext();
    const a = await first.newPage(),
      b = await second.newPage();
    try {
      await login(a, 8501, request);
      await first.setOffline(true);
      await createWithFile(a);
      await a.reload();
      await openDetail(a);
      await downloadFile(a);
      await first.setOffline(false);
      await a.getByRole("button", { name: "Close dialog" }).click();
      await expect
        .poll(async () =>
          (await a.request.get(base + "/api/workspace"))
            .json()
            .then((data) => data.snapshot.projects[0].todoList.length),
        )
        .toBe(1);
      await login(b, 8501, request);
      await openDetail(b);
      await downloadFile(b);
    } finally {
      await first.close();
      await second.close();
    }
  },
);
for (const width of [360, 399, 759, 760])
  test(`description input is at least 16px at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "+ Add Task", exact: true }).click();
    const input = page.getByLabel("Description · Markdown");
    await input.fill("# Long text\n\nMore text");
    expect(
      await input.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    const scale = await page.evaluate(() => visualViewport.scale);
    await input.focus();
    expect(await page.evaluate(() => visualViewport.scale)).toBe(scale);
    await page.keyboard.press("Escape");
  });

for (const width of [360, 430])
  test(`mobile content fills the viewport after scrolling and resizing at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      const data = JSON.parse(localStorage.getItem("todo_app"));
      const project = data.projects.find((p) => p.project_id === "work");
      project.project_view = "list";
      project.todoList = Array.from({ length: 60 }, (_, index) => ({
        task_id: `long-${index}`,
        task_title: `Long task ${String(index).padStart(2, "0")}`,
        task_description: "Long content\n\n**More content**",
        task_status: "pending",
        task_priority: "low",
        task_due_date: "",
      }));
      localStorage.setItem("todo_app", JSON.stringify(data));
    });
    await page.goto("/");
    await expect(
      page.locator(".task-card").last().locator(".wmde-markdown"),
    ).toContainText("More content");
    for (const height of [800, 620, 900]) {
      await page.setViewportSize({ width, height });
      await page.locator("main").evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      await expect(
        page.getByRole("heading", { name: "Long task 59", exact: true }),
      ).toBeInViewport();
      expect(
        await page.evaluate(() => {
          const main = document.querySelector("main");
          return (
            Math.abs(main.getBoundingClientRect().bottom - innerHeight) < 2 &&
            document
              .elementFromPoint(innerWidth / 2, innerHeight - 30)
              ?.closest("main") !== null
          );
        }),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/mobile-scroll-${width}-${height}.png`,
      });
    }
  });

test("backup carries attachment bytes through a new import", async ({
  page,
}) => {
  await page.goto("/");
  await createWithFile(page);
  await page
    .getByRole("button", { name: "Import projects and tasks", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download current tasks" }).click();
  const backup = await download;
  await page
    .locator('dialog input[type="file"]')
    .setInputFiles(await backup.path());
  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add projects and tasks" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const cards = page.locator(".task-card").filter({
    has: page.getByRole("heading", { name: "With attachment", exact: true }),
  });
  await expect(cards).toHaveCount(2);
  await cards.last().getByRole("button", { name: "Show more" }).click();
  await downloadFile(page);
});
