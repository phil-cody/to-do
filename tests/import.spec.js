import { test, expect } from "./fixtures/workspace.js";
import { readFile } from "node:fs/promises";
const template = async () =>
  JSON.parse(await readFile("docs/templates/project-template.json", "utf8"));
const file = (value) => ({
  name: "project.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(value)),
});
async function openImport(page) {
  await page
    .getByRole("button", { name: "Импорт проектов и задач", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Импорт проектов и задач",
    exact: true,
  });
}

test("downloaded template imports only after confirmation; duplicate imports keep existing tasks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const dialog = await openImport(page);
  const downloadEvent = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Скачать шаблон проекта" }).click();
  const download = await downloadEvent;
  const content = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(content).toEqual(await template());
  const backupEvent = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Скачать текущие задачи" }).click();
  const backup = await backupEvent;
  const stored = JSON.parse(await readFile(await backup.path(), "utf8"));
  expect(stored.projects.map((project) => project.project_title)).toEqual([
    "Inbox",
    "Work",
  ]);

  await dialog
    .getByLabel("Файл проекта или резервной копии", { exact: false })
    .setInputFiles(file(content));
  await expect(dialog.getByLabel("Предпросмотр импорта")).toContainText(
    "Задач: 2",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("todo_app")).projects.length,
    ),
  ).toBe(2);
  await dialog
    .getByRole("button", { name: "Добавить проекты и задачи" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Legacy task", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Подготовить план", exact: true }),
  ).toBeVisible();
  await openImport(page);
  await page
    .getByLabel("Файл проекта или резервной копии", { exact: false })
    .setInputFiles(file(content));
  await page.getByRole("button", { name: "Добавить проекты и задачи" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("todo_app")),
  );
  expect(snapshot.projects.map((p) => p.project_title)).toContain(
    "Мой новый проект (импорт 2)",
  );
  expect(snapshot.projects.flatMap((p) => p.todoList)).toHaveLength(5);
});

test("invalid dates and cancelling the preview never change stored data", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(() => localStorage.getItem("todo_app"));
  const dialog = await openImport(page),
    content = await template();
  content.project.tasks[0].dueDate = "2026-02-30";
  await dialog
    .getByLabel("Файл проекта или резервной копии", { exact: false })
    .setInputFiles(file(content));
  await expect(dialog.getByRole("alert")).toContainText("задача 1, срок");
  await expect(
    dialog.getByRole("button", { name: "Добавить проекты и задачи" }),
  ).toHaveCount(0);
  content.project.tasks[0].dueDate = "";
  await dialog
    .getByLabel("Файл проекта или резервной копии", { exact: false })
    .setInputFiles(file(content));
  await expect(dialog.getByLabel("Предпросмотр импорта")).toBeVisible();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  expect(await page.evaluate(() => localStorage.getItem("todo_app"))).toBe(
    before,
  );
});

test("failed storage write preserves the import preview and succeeds on retry", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(() => localStorage.getItem("todo_app"));
  const dialog = await openImport(page);
  await dialog
    .getByLabel("Файл проекта или резервной копии", { exact: false })
    .setInputFiles(file(await template()));
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("Disk full");
    };
  });
  await dialog
    .getByRole("button", { name: "Добавить проекты и задачи" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Disk full");
  await expect(dialog.getByLabel("Предпросмотр импорта")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("todo_app"))).toBe(
    before,
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  await dialog
    .getByRole("button", { name: "Добавить проекты и задачи" })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("todo_app")).projects.length,
    ),
  ).toBe(3);
});
