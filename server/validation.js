import {
  normalize,
  statuses,
  priorities,
  views,
  workspaceLimits,
  isDueDate,
} from "../src/app/model.js";
import { validLanguage } from "../src/app/i18n.js";
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (message) => {
  throw new ApiError(422, message);
};
const text = (value, max, label) => {
  if (typeof value !== "string" || value.length > max)
    fail(`Некорректное поле: ${label}.`);
};
export function validateSnapshot(input) {
  if (
    !input ||
    !Array.isArray(input.projects) ||
    !input.projects.length ||
    input.projects.length > workspaceLimits.projects
  )
    fail("Нужно от 1 до 300 проектов.");
  let count = 0;
  const projects = new Set(),
    tasks = new Set();
  for (const p of input.projects) {
    if (!p || typeof p !== "object") fail("Некорректный проект.");
    text(p.project_id, 100, "ID проекта");
    if (!p.project_id || projects.has(p.project_id))
      fail("ID проектов должны быть уникальными.");
    projects.add(p.project_id);
    text(p.project_title, workspaceLimits.title, "название проекта");
    if (!p.project_title.trim()) fail("Название проекта не может быть пустым.");
    text(
      p.project_description,
      workspaceLimits.description,
      "описание проекта",
    );
    if (
      !Number.isInteger(p.project_priority) ||
      p.project_priority < 1 ||
      p.project_priority > workspaceLimits.projectOrder
    )
      fail("Некорректный порядок проекта.");
    if (
      typeof p.project_pinned !== "boolean" ||
      !Number.isSafeInteger(p.project_pin_position ?? 0)
    )
      fail("Некорректное закрепление.");
    if (!views.includes(p.project_view)) fail("Неизвестный вид.");
    if (!Array.isArray(p.todoList)) fail("Некорректный список задач.");
    for (const t of p.todoList) {
      if (++count > workspaceLimits.tasks) fail("Лимит — 10000 задач.");
      if (!t || typeof t !== "object") fail("Некорректная задача.");
      text(t.task_id, 100, "ID задачи");
      if (!t.task_id || tasks.has(t.task_id))
        fail("ID задач должны быть уникальными.");
      tasks.add(t.task_id);
      if (t.task_project !== p.project_id)
        fail("Неверная принадлежность задачи.");
      text(t.task_title, workspaceLimits.title, "название задачи");
      if (!t.task_title.trim()) fail("Название задачи не может быть пустым.");
      text(t.task_description, workspaceLimits.description, "описание задачи");
      if (
        !Object.keys(statuses).includes(t.task_status) ||
        !Object.keys(priorities).includes(t.task_priority)
      )
        fail("Некорректный статус или приоритет.");
      if (!isDueDate(t.task_due_date)) fail("Некорректный срок.");
    }
  }
  // Normalize into a known schema; copy only declared fields, never arbitrary JSON.
  const data = normalize(input);
  data.projects = data.projects.map((p) => ({
    project_id: p.project_id,
    project_title: p.project_title,
    project_description: p.project_description,
    project_priority: p.project_priority,
    project_pinned: p.project_pinned,
    project_pin_position: p.project_pin_position,
    project_type: p.project_type === "inbox" ? "inbox" : "custom",
    project_view: p.project_view,
    project_filter: String(p.project_filter).slice(0, 60),
    createdAt: typeof p.createdAt === "string" ? p.createdAt.slice(0, 40) : "",
    todoList: p.todoList.map((t) =>
      Object.fromEntries(
        [
          "task_id",
          "task_project",
          "task_title",
          "task_description",
          "task_due_date",
          "task_status",
          "task_priority",
          "task_createdAt",
        ].map((k) => [k, t[k]]),
      ),
    ),
  }));
  if (
    Buffer.byteLength(JSON.stringify(data), "utf8") >
    workspaceLimits.snapshotBytes
  )
    fail("Данные рабочей области превышают 2 МБ.");
  return data;
}
export function validateSettings(input) {
  if (input?.language !== undefined && !validLanguage(input.language))
    fail("Выберите язык: en или ru.");
  if (
    !input ||
    typeof input.enabled !== "boolean" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time || "")
  )
    fail("Укажите время HH:MM.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format();
  } catch {
    fail("Неизвестный часовой пояс.");
  }
  if (typeof input.timezone !== "string" || input.timezone.length > 100)
    fail("Некорректный часовой пояс.");
  return {
    enabled: input.enabled,
    time: input.time,
    timezone: input.timezone,
    ...(input.language !== undefined ? { language: input.language } : {}),
  };
}
