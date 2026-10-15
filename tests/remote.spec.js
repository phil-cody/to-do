import { test, expect } from "@playwright/test";
import { base, login, addTask } from "./fixtures/remote.js";

test("Switching the shared session cannot upload an old account's offline queue to another account", async ({
  browser,
  request,
}) => {
  const first = await browser.newContext(),
    second = await browser.newContext(),
    oldTab = await first.newPage(),
    newAccount = await second.newPage();
  try {
    await login(oldTab, 9001, request);
    await login(newAccount, 9002, request);
    await addTask(newAccount, "Second account private task");
    await first.setOffline(true);
    await addTask(oldTab, "First account offline draft");
    // Cookies are shared by tabs; emulate signing into another account while
    // this tab retains its original workspace and durable queue.
    await first.addCookies(await second.cookies());
    await first.setOffline(false);
    await expect(
      oldTab.getByRole("heading", { name: "Sign in with Telegram" }),
    ).toBeVisible();
    await expect(
      oldTab.getByRole("heading", { name: "Second account private task" }),
    ).toHaveCount(0);
    const response = await second.request.get(base + "/api/workspace");
    const data = await response.json();
    expect(
      data.snapshot.projects
        .flatMap((project) => project.todoList)
        .map((task) => task.task_title),
    ).toEqual(["Second account private task"]);
    const saved = await oldTab.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("todo-sync-v1", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return new Promise((resolve, reject) => {
        const tx = db.transaction("state", "readonly"),
          request = tx.objectStore("state").get("user:9001");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      });
    });
    expect(saved.queue).toHaveLength(1);
    expect(JSON.stringify(saved)).not.toContain("Second account private task");
    expect(JSON.stringify(saved.queue)).toContain(
      "First account offline draft",
    );
  } finally {
    await first.close();
    await second.close();
  }
});

test("Telegram login isolates users, bot messages update live, logout requires reauthentication", async ({
  browser,
  request,
}) => {
  const first = await browser.newContext(),
    second = await browser.newContext(),
    page = await first.newPage(),
    other = await second.newPage();
  try {
    await login(page, 1001, request);
    await login(other, 1002, request);
    await addTask(page, "Private account task");
    await expect(
      other.getByRole("heading", { name: "Private account task" }),
    ).toHaveCount(0);
    await request.post("http://localhost:4011", {
      data: { user: 1001, text: "Task from Telegram\nMarkdown **notes**" },
    });
    await expect(
      page.getByRole("heading", { name: "Task from Telegram", exact: true }),
    ).toBeVisible();
    await expect(
      other.getByRole("heading", { name: "Task from Telegram" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Telegram and account" }).click();
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Sign in with Telegram" }),
    ).toBeVisible();
    await expect
      .poll(async () =>
        (await first.request.get(base + "/api/workspace")).status(),
      )
      .toBe(401);
  } finally {
    await first.close();
    await second.close();
  }
});

test("Two tabs and another device receive task changes without reload", async ({
  browser,
  request,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext(),
    one = await a.newPage(),
    two = await a.newPage(),
    device = await b.newPage();
  try {
    await login(one, 2001, request);
    await two.goto(base);
    await expect(
      two.getByRole("heading", { name: "Inbox", exact: true }),
    ).toBeVisible();
    await login(device, 2001, request);
    await addTask(one, "Synchronized task");
    await expect(
      two.getByRole("heading", { name: "Synchronized task", exact: true }),
    ).toBeVisible();
    await expect(
      device.getByRole("heading", { name: "Synchronized task", exact: true }),
    ).toBeVisible();
    await two.getByRole("button", { name: "List", exact: true }).click();
    await expect(
      one.getByRole("button", { name: "List", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    await a.close();
    await b.close();
  }
});

test("Offline reload preserves queued tasks and reconnect merges changes from another device", async ({
  browser,
  request,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext(),
    one = await a.newPage(),
    two = await b.newPage();
  try {
    await login(one, 3001, request);
    await login(two, 3001, request);
    await one.waitForFunction(() => !!navigator.serviceWorker.controller);
    await a.setOffline(true);
    await addTask(one, "Offline task");
    await one.reload();
    await expect(
      one.getByRole("heading", { name: "Offline task", exact: true }),
    ).toBeVisible();
    await addTask(two, "Other device task");
    await a.setOffline(false);
    await expect(
      one.getByRole("heading", { name: "Other device task", exact: true }),
    ).toBeVisible();
    await expect(
      two.getByRole("heading", { name: "Offline task", exact: true }),
    ).toBeVisible();
    await expect(one.getByLabel("Synchronization")).toContainText("Synced");
    const privateCaches = await one.evaluate(async () => {
      const keys = await caches.keys();
      return (
        await Promise.all(
          keys.map(async (key) =>
            (await (await caches.open(key)).keys()).map((r) => r.url),
          ),
        )
      )
        .flat()
        .filter((url) => new URL(url).pathname.startsWith("/api/"));
    });
    expect(privateCaches).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});

test("Concurrent same-field edits require explicit conflict resolution", async ({
  browser,
  request,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext(),
    one = await a.newPage(),
    two = await b.newPage();
  try {
    await login(one, 4001, request);
    await login(two, 4001, request);
    await addTask(one, "Original title");
    await expect(
      two.getByRole("heading", { name: "Original title", exact: true }),
    ).toBeVisible();
    await a.setOffline(true);
    await one
      .locator(".task-card")
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    await one.getByLabel("Title", { exact: true }).fill("My title");
    await one.getByRole("button", { name: "Save task", exact: true }).click();
    await two
      .locator(".task-card")
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    await two.getByLabel("Title", { exact: true }).fill("Server title");
    await two.getByRole("button", { name: "Save task", exact: true }).click();
    await expect(two.getByRole("dialog")).not.toBeVisible();
    await expect(
      two.getByRole("heading", { name: "Server title", exact: true }),
    ).toBeVisible();
    await a.setOffline(false);
    await expect(one.getByLabel("Synchronization")).toContainText(
      "Conflicting changes",
    );
    one.once("dialog", (d) => d.accept());
    await one
      .getByRole("button", { name: "Apply my changes", exact: true })
      .click();
    await expect(
      two.getByRole("heading", { name: "My title", exact: true }),
    ).toBeVisible();
    await expect(one.getByLabel("Synchronization")).toContainText("Synced");
  } finally {
    await a.close();
    await b.close();
  }
});

test("Telegram task form link survives authentication and saves to the authenticated account", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await login(page, 5001, request, "#new-task");
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Title", { exact: true })
      .fill("Authenticated form task");
    await dialog
      .getByLabel("Description · Markdown")
      .fill("**From Telegram form**");
    await dialog.getByLabel("Priority", { exact: true }).selectOption("high");
    await dialog.getByLabel("Due date").fill("2026-12-01");
    await dialog
      .getByRole("button", { name: "Save task", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Authenticated form task",
        exact: true,
      }),
    ).toBeVisible();
    const response = await context.request.get(base + "/api/workspace");
    const { snapshot } = await response.json();
    const task = snapshot.projects[0].todoList[0];
    expect(task.task_title).toBe("Authenticated form task");
    expect(task.task_priority).toBe("high");
    expect(task.task_due_date).toBe("2026-12-01");
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Authenticated form task",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("timezone is selected by city, persists after saving and fits a mobile screen", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const page = await context.newPage();
  try {
    await login(page, 6001, request);
    await page.getByRole("button", { name: "Telegram and account" }).click();
    const select = page.getByRole("combobox", {
      name: "Time zone",
      exact: true,
    });
    await expect(select).toHaveValue("UTC");
    await expect(
      page.getByRole("textbox", { name: "Time zone", exact: true }),
    ).toHaveCount(0);
    const vietnam = select
      .locator("option")
      .filter({ hasText: "Ho Chi Minh City" });
    await expect(vietnam).toHaveCount(1);
    await expect(vietnam).toHaveText(
      /Ho Chi Minh City, Vietnam \(UTC\+07:00\) — on this device/,
    );
    const timezone = await vietnam.getAttribute("value");
    await select.selectOption(timezone);
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(
      page.getByRole("button", { name: "Save schedule" }),
    ).toBeEnabled();
    const response = await context.request.get(base + "/api/me");
    expect((await response.json()).settings.timezone).toBe(timezone);
    await page.reload();
    await page.getByRole("button", { name: "Telegram and account" }).click();
    await expect(select).toHaveValue(timezone);
    await select.selectOption("Asia/Kathmandu");
    await expect(select.locator("option:checked")).toHaveText(
      /Kathmandu \(UTC\+05:45\)/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test("local task migration previews before saving, preserves its source and stays within the account", async ({
  browser,
  request,
}) => {
  const first = await browser.newContext(),
    second = await browser.newContext();
  const page = await first.newPage(),
    other = await second.newPage();
  try {
    await login(page, 8001, request);
    await addTask(page, "Existing server task");
    const raw = JSON.stringify({
      projects: [
        {
          project_title: "Inbox",
          project_type: "inbox",
          todoList: [
            {
              task_title: "Migrated Inbox task",
              task_description: "**Keep notes**",
            },
          ],
        },
        {
          project_title: "Prepared project",
          todoList: [
            { task_title: "Migrated project task", task_priority: "high" },
          ],
        },
      ],
    });
    await page.evaluate((raw) => localStorage.setItem("todo_app", raw), raw);
    await page.getByRole("button", { name: "Telegram and account" }).click();
    await page.getByRole("button", { name: "Migrate local tasks" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Import projects and tasks",
    });
    await dialog.getByRole("button", { name: "Read local tasks" }).click();
    await expect(dialog.getByLabel("Import preview")).toContainText("Tasks: 2");
    let response = await first.request.get(base + "/api/workspace");
    expect((await response.json()).snapshot.projects).toHaveLength(1);
    await dialog
      .getByRole("button", { name: "Add projects and tasks" })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Existing server task", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Migrated project task", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("todo_app"))).toBe(
      raw,
    );
    response = await first.request.get(base + "/api/workspace");
    const snapshot = (await response.json()).snapshot;
    expect(snapshot.projects).toHaveLength(2);
    expect(
      snapshot.projects.find((p) => p.project_type === "inbox").todoList,
    ).toHaveLength(2);
    await login(other, 8002, request);
    const isolated = await second.request.get(base + "/api/workspace");
    expect((await isolated.json()).snapshot.projects[0].todoList).toHaveLength(
      0,
    );
  } finally {
    await first.close();
    await second.close();
  }
});
