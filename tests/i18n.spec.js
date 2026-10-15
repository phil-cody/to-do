import { test, expect } from "./fixtures/workspace.js";
import { base, login } from "./fixtures/remote.js";

test("Project description previews two lines and expands without losing Markdown", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const data = JSON.parse(localStorage.getItem("todo_app"));
    data.projects[1].project_description =
      "**First line**\n\nSecond paragraph\n\nThird paragraph with [a link](https://example.com)\n\nLast paragraph";
    localStorage.setItem("todo_app", JSON.stringify(data));
  });
  await page.goto("/");
  const description = page.getByRole("region", { name: "Project description" });
  const toggle = description.getByRole("button", {
    name: "Expand",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const preview = description.locator(".project-description-content");
  await expect(description.locator("strong")).toHaveText("First line");
  const height = await preview.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  expect(height).toBeLessThanOrEqual(60);
  await toggle.click();
  await expect(
    description.getByRole("button", { name: "Collapse" }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(
    await preview.evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThan(height);
  await expect(description.getByRole("link", { name: "a link" })).toBeVisible();
  await description.getByRole("button", { name: "Collapse" }).click();
  await expect(toggle).toBeVisible();
});

test("Local interface switches as a whole, localizes editor, errors and clock, and remembers language", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Telegram and account", exact: true })
    .click();
  await page.getByLabel("Language", { exact: true }).selectOption("ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(
    page.getByRole("button", { name: "Сетка", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Grid", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".date__day")).toContainText(/[а-яё]/i);
  await expect(
    page.getByRole("combobox", { name: "Фильтр" }).locator("option"),
  ).toHaveText([
    "Все задачи",
    "Ожидает",
    "В работе",
    "Завершено",
    "Просрочено",
    "Сегодня",
    "Завтра",
    "На этой неделе",
    "Высокий приоритет",
    "Средний приоритет",
    "Низкий приоритет",
  ]);
  await page
    .locator(".task-card")
    .getByRole("button", { name: "Изменить", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Изменить задачу" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Полужирный текст (ctrl + b)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Предпросмотр (ctrl + 9)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Название", { exact: true })).toHaveValue(
    "Legacy task",
  );
  await dialog.getByRole("button", { name: "Закрыть окно" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page
    .getByRole("button", { name: "Telegram и аккаунт", exact: true })
    .click();
  await page.getByLabel("Язык", { exact: true }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "Grid", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import projects and tasks", exact: true })
    .click();
  await page
    .getByLabel("Project or backup file (JSON, up to 2 MB)")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        '{"format":"just-to-do-it/project","version":1,"project":{"title":"Test","tasks":[{"title":"A","dueDate":"2026-02-30"}]}}',
      ),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Project 1, task 1, due date: expected a real YYYY-MM-DD date",
  );
  expect(await page.getByRole("dialog").innerText()).not.toMatch(/[а-яё]/i);
});

test("Account language syncs across devices, survives offline reload and changes from the bot", async ({
  browser,
  request,
}) => {
  const one = await browser.newContext(),
    two = await browser.newContext();
  const first = await one.newPage(),
    second = await two.newPage();
  try {
    await login(first, 11001, request);
    await login(second, 11001, request);
    await first.getByRole("button", { name: "Telegram and account" }).click();
    await first.getByLabel("Language", { exact: true }).selectOption("ru");
    await expect(first.locator("html")).toHaveAttribute("lang", "ru");
    await expect(second.locator("html")).toHaveAttribute("lang", "ru");
    await first.waitForFunction(() => !!navigator.serviceWorker.controller);
    await one.setOffline(true);
    await first.reload();
    await expect(
      first.getByRole("button", { name: "Telegram и аккаунт" }),
    ).toBeVisible();
    await expect(first.locator("html")).toHaveAttribute("lang", "ru");
    await one.setOffline(false);
    await first
      .getByRole("button", { name: "+ Добавить задачу", exact: true })
      .click();
    await first
      .getByRole("dialog")
      .getByLabel("Название", { exact: true })
      .fill("Unsaved personal draft");
    await request.post("http://localhost:4011", {
      data: { user: 11001, text: "/language en" },
    });
    await expect(first.locator("html")).toHaveAttribute("lang", "en");
    await expect(second.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      first.getByRole("dialog").getByLabel("Title", { exact: true }),
    ).toHaveValue("Unsaved personal draft");
    await expect(
      first
        .getByRole("dialog")
        .getByRole("button", { name: "Save task", exact: true }),
    ).toBeVisible();
    await first.getByRole("button", { name: "Close dialog" }).click();
    const response = await one.request.get(base + "/api/me");
    expect((await response.json()).settings.language).toBe("en");
    await first.reload();
    await expect(
      first.getByRole("button", { name: "Telegram and account" }),
    ).toBeVisible();
  } finally {
    await one.close();
    await two.close();
  }
});

for (const width of [360, 399, 760, 1440]) {
  test(`Russian interface fits ${width}px without horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem("todo_language", "ru"));
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Telegram и аккаунт" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("main")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.getByRole("button", { name: "Telegram и аккаунт" }).click();
    await expect(page.getByLabel("Язык", { exact: true })).toHaveValue("ru");
    await page
      .getByRole("button", { name: "+ Добавить задачу", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByLabel("Название", { exact: true }),
    ).toBeVisible();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.getByRole("button", { name: "Закрыть окно" }).click();
    await page.screenshot({ path: `test-results/russian-${width}.png` });
  });
}
