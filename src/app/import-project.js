import {
  statuses,
  priorities,
  views,
  workspaceLimits,
  isDueDate,
} from "./model.js";
import { normalizeDescription } from "./description.js";
const fail = (where, message) => {
  throw new Error(`${where}: ${message}`);
};
const object = (value, where) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(where, "ожидается объект.");
  return value;
};
function keys(value, allowed, where) {
  object(value, where);
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) fail(where, `неизвестное поле «${unknown}». Проверьте шаблон.`);
}
function text(value, limit, where, required = false) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > limit)
    fail(where, `нужен текст не длиннее ${limit} символов.`);
  if (required && !value.trim()) fail(where, "название не может быть пустым.");
  return required ? value.trim() : value;
}
function choice(value, options, fallback, where) {
  if (value === undefined) return fallback;
  if (!options.includes(value))
    fail(where, `допустимые значения: ${options.join(", ")}.`);
  return value;
}
function date(value, where) {
  if (value === undefined || value === "") return "";
  if (!isDueDate(value))
    fail(where, "нужна существующая дата ГГГГ-ММ-ДД или пустая строка.");
  return value;
}
export function parseProjectImport(raw) {
  if (new TextEncoder().encode(raw).length > workspaceLimits.snapshotBytes)
    throw new Error("Файл слишком большой. Максимум — 2 МБ.");
  let input;
  try {
    input = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(
      "Не удалось прочитать JSON. Проверьте запятые, кавычки и формат файла.",
    );
  }
  object(input, "Файл");
  const template = Object.hasOwn(input, "format");
  let source;
  if (template) {
    keys(input, ["format", "version", "project"], "Файл");
    if (input.format !== "just-to-do-it/project" || input.version !== 1)
      throw new Error(
        "Неизвестный формат или версия шаблона. Скачайте актуальный шаблон.",
      );
    source = [object(input.project, "Проект")];
  } else {
    if (!Array.isArray(input.projects))
      throw new Error(
        "Нужен шаблон проекта или резервная копия с массивом projects.",
      );
    source = input.projects;
  }
  if (!source.length || source.length > workspaceLimits.projects)
    throw new Error("В файле должно быть от 1 до 300 проектов.");
  let taskCount = 0;
  const projects = source.map((value, index) => {
    const where = `Проект ${index + 1}`;
    object(value, where);
    if (template) keys(value, ["title", "description", "view", "tasks"], where);
    const list = template ? value.tasks : value.todoList;
    if (!Array.isArray(list))
      fail(where, "список задач должен быть массивом (можно пустым).");
    taskCount += list.length;
    if (taskCount > workspaceLimits.tasks)
      fail("Файл", "максимум — 10000 задач.");
    return {
      project_title: text(
        template ? value.title : value.project_title,
        workspaceLimits.title,
        where,
        true,
      ),
      project_description: normalizeDescription(
        text(
          template ? value.description : value.project_description,
          workspaceLimits.description,
          `${where}, описание`,
        ),
      ),
      project_view: choice(
        template ? value.view : value.project_view,
        views,
        "grid",
        `${where}, вид`,
      ),
      project_type:
        !template && value.project_type === "inbox" ? "inbox" : "custom",
      todoList: list.map((task, number) => {
        const at = `${where}, задача ${number + 1}`;
        object(task, at);
        if (template)
          keys(
            task,
            ["title", "description", "dueDate", "status", "priority"],
            at,
          );
        const created = template ? undefined : task.task_createdAt;
        return {
          task_title: text(
            template ? task.title : task.task_title,
            workspaceLimits.title,
            at,
            true,
          ),
          task_description: normalizeDescription(
            text(
              template ? task.description : task.task_description,
              workspaceLimits.description,
              `${at}, описание`,
            ),
          ),
          task_due_date: date(
            template ? task.dueDate : task.task_due_date,
            `${at}, срок`,
          ),
          task_status: choice(
            template ? task.status : task.task_status,
            Object.keys(statuses),
            "pending",
            `${at}, статус`,
          ),
          task_priority: choice(
            template ? task.priority : task.task_priority,
            Object.keys(priorities),
            "low",
            `${at}, приоритет`,
          ),
          task_createdAt:
            typeof created === "string" &&
            created.length <= 40 &&
            Number.isFinite(Date.parse(created))
              ? created
              : "",
        };
      }),
    };
  });
  return { projects, taskCount };
}
export function appendProjectImport(current, imported) {
  const next = structuredClone(current);
  const names = new Set(
    next.projects.map((p) => p.project_title.toLocaleLowerCase()),
  );
  let order = Math.max(0, ...next.projects.map((p) => p.project_priority));
  const createdAt = new Date().toISOString();
  for (const project of imported.projects) {
    const inbox =
      project.project_type === "inbox" &&
      next.projects.find((p) => p.project_type === "inbox");
    const id = inbox ? inbox.project_id : crypto.randomUUID();
    const tasks = project.todoList.map((task) => ({
      ...task,
      task_id: crypto.randomUUID(),
      task_project: id,
      task_createdAt: task.task_createdAt || createdAt,
    }));
    if (inbox) {
      inbox.todoList.push(...tasks);
      continue;
    }
    let title = project.project_title,
      suffix = 2;
    while (names.has(title.toLocaleLowerCase())) {
      const ending = ` (импорт ${suffix++})`;
      title =
        project.project_title.slice(0, workspaceLimits.title - ending.length) +
        ending;
    }
    names.add(title.toLocaleLowerCase());
    if (++order > workspaceLimits.projectOrder)
      throw new Error(
        "Не хватает значений порядка проектов. Уменьшите порядок существующих проектов.",
      );
    next.projects.push({
      project_id: id,
      project_title: title,
      project_description: project.project_description,
      project_priority: order,
      project_pinned: false,
      project_pin_position: 0,
      project_type: "custom",
      project_view: project.project_view,
      project_filter: "all",
      createdAt,
      todoList: tasks,
    });
  }
  const tasks = next.projects.reduce(
    (count, p) => count + p.todoList.length,
    0,
  );
  if (
    next.projects.length > workspaceLimits.projects ||
    tasks > workspaceLimits.tasks
  )
    throw new Error(
      "После импорта будет превышен лимит: 300 проектов или 10000 задач. Ничего не добавлено.",
    );
  if (
    new TextEncoder().encode(JSON.stringify(next)).length >
    workspaceLimits.snapshotBytes
  )
    throw new Error(
      "После импорта данные превысят 2 МБ. Уменьшите объём описаний. Ничего не добавлено.",
    );
  next.selectedProjectId = "all";
  return next;
}
