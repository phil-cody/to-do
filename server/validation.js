import { normalize } from "../src/app/model.js";
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
    input.projects.length > 300
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
    text(p.project_title, 200, "название проекта");
    if (!p.project_title.trim()) fail("Название проекта не может быть пустым.");
    text(p.project_description, 100000, "описание проекта");
    if (
      !Number.isInteger(p.project_priority) ||
      p.project_priority < 1 ||
      p.project_priority > 999999
    )
      fail("Некорректный порядок проекта.");
    if (
      typeof p.project_pinned !== "boolean" ||
      !Number.isSafeInteger(p.project_pin_position ?? 0)
    )
      fail("Некорректное закрепление.");
    if (!["grid", "list", "kanban"].includes(p.project_view))
      fail("Неизвестный вид.");
    if (!Array.isArray(p.todoList)) fail("Некорректный список задач.");
    for (const t of p.todoList) {
      if (++count > 10000) fail("Лимит — 10000 задач.");
      if (!t || typeof t !== "object") fail("Некорректная задача.");
      text(t.task_id, 100, "ID задачи");
      if (!t.task_id || tasks.has(t.task_id))
        fail("ID задач должны быть уникальными.");
      tasks.add(t.task_id);
      if (t.task_project !== p.project_id)
        fail("Неверная принадлежность задачи.");
      text(t.task_title, 200, "название задачи");
      if (!t.task_title.trim()) fail("Название задачи не может быть пустым.");
      text(t.task_description, 100000, "описание задачи");
      if (
        !["pending", "in-process", "completed"].includes(t.task_status) ||
        !["low", "medium", "high"].includes(t.task_priority)
      )
        fail("Некорректный статус или приоритет.");
      if (
        typeof t.task_due_date !== "string" ||
        (t.task_due_date &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(t.task_due_date) ||
            !Number.isFinite(Date.parse(t.task_due_date)) ||
            new Date(t.task_due_date).toISOString().slice(0, 10) !==
              t.task_due_date))
      )
        fail("Некорректный срок.");
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
  return data;
}
export function validateSettings(input) {
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
  return { enabled: input.enabled, time: input.time, timezone: input.timezone };
}
