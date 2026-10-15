import { test, expect } from "@playwright/test";
const base = "http://localhost:4010";
async function login(page, user, request) {
  await page.setExtraHTTPHeaders({
    "X-Real-IP": `10.0.${Math.floor(user / 256)}.${user % 256}`,
  });
  await page.goto(base);
  await page
    .getByRole("button", { name: "Войти через Telegram", exact: true })
    .click();
  const link = page.getByRole("link", {
    name: "Открыть Telegram и подтвердить вход",
  });
  await expect(link).toBeVisible();
  const challenge = new URL(await link.getAttribute("href")).searchParams
    .get("start")
    .slice("login_".length);
  await request.post("http://localhost:4011", { data: { user, challenge } });
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
}
async function addTask(page, title) {
  await page.getByRole("button", { name: "+ Add Task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}

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
    await page.getByRole("button", { name: "Telegram и аккаунт" }).click();
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Вход через Telegram" }),
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
    await expect(one.getByLabel("Синхронизация")).toContainText(
      "Синхронизировано",
    );
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
    await expect(one.getByLabel("Синхронизация")).toContainText(
      "Конфликт изменений",
    );
    one.once("dialog", (d) => d.accept());
    await one
      .getByRole("button", { name: "Применить мои изменения", exact: true })
      .click();
    await expect(
      two.getByRole("heading", { name: "My title", exact: true }),
    ).toBeVisible();
    await expect(one.getByLabel("Синхронизация")).toContainText(
      "Синхронизировано",
    );
  } finally {
    await a.close();
    await b.close();
  }
});
