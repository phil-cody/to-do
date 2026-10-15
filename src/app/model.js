import { normalizeDescription } from "./description.js";
export const workspaceLimits = Object.freeze({
  projects: 300,
  tasks: 10000,
  title: 200,
  description: 100000,
  projectOrder: 999999,
  snapshotBytes: 2_000_000,
  requestBytes: 2 * 1024 * 1024,
});
export function isDueDate(value) {
  return (
    typeof value === "string" &&
    (value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value))
  );
}
export const statuses = {
  pending: "Pending",
  "in-process": "In progress",
  completed: "Completed",
};
export const priorities = { high: "High", medium: "Medium", low: "Low" };
export const views = ["grid", "list", "kanban"];
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function normalize(data) {
  if (!data || !Array.isArray(data.projects))
    throw new Error(
      "Saved data has an invalid format. Your original data has been preserved.",
    );
  const projectIds = new Set(),
    taskIds = new Set();
  const projects = data.projects.map((p, index) => {
    const id = String(p.project_id || crypto.randomUUID());
    if (projectIds.has(id) || !Array.isArray(p.todoList))
      throw new Error(
        "Saved projects are invalid. Your original data has been preserved.",
      );
    projectIds.add(id);
    return {
      ...p,
      project_id: id,
      project_title: String(p.project_title || "Untitled project"),
      project_description: normalizeDescription(p.project_description),
      project_priority:
        Number.isFinite(Number(p.project_priority)) &&
        Number(p.project_priority) > 0
          ? Number(p.project_priority)
          : index + 1,
      project_pinned: !!p.project_pinned,
      project_pin_position: Number.isInteger(p.project_pin_position)
        ? p.project_pin_position
        : index,
      project_view: views.includes(p.project_view) ? p.project_view : "grid",
      project_filter:
        typeof p.project_filter === "string" ? p.project_filter : "all",
      todoList: p.todoList.map((t) => {
        const task_id = String(t.task_id || crypto.randomUUID());
        if (taskIds.has(task_id))
          throw new Error(
            "Duplicate task IDs in saved data. Your original data has been preserved.",
          );
        taskIds.add(task_id);
        return {
          ...t,
          task_id,
          task_project: id,
          task_title: String(t.task_title || "Untitled task"),
          task_description: normalizeDescription(t.task_description),
          task_createdAt:
            typeof t.task_createdAt === "string" ? t.task_createdAt : "",
          task_status: Object.hasOwn(statuses, t.task_status)
            ? t.task_status
            : "pending",
          task_priority: Object.hasOwn(priorities, t.task_priority)
            ? t.task_priority
            : "low",
          task_due_date:
            typeof t.task_due_date === "string" &&
            /^\d{4}-\d{2}-\d{2}/.test(t.task_due_date)
              ? t.task_due_date.slice(0, 10)
              : "",
        };
      }),
    };
  });
  if (!projects.length)
    projects.push({
      project_id: crypto.randomUUID(),
      project_title: "Inbox",
      project_description: "A little space for your next big idea.",
      project_priority: 1,
      project_type: "inbox",
      project_pinned: true,
      project_pin_position: 0,
      project_view: "grid",
      project_filter: "all",
      todoList: [],
    });
  return {
    schemaVersion: 2,
    projects,
    selectedProjectId:
      data.selectedProjectId === "all" ||
      projects.some((p) => p.project_id === data.selectedProjectId)
        ? data.selectedProjectId
        : projects[0].project_id,
    allView: views.includes(data.allView) ? data.allView : "list",
    allFilter: typeof data.allFilter === "string" ? data.allFilter : "all",
  };
}
export function orderedProjects(projects) {
  return [...projects].sort(
    (a, b) =>
      Number(b.project_pinned) - Number(a.project_pinned) ||
      (a.project_pinned
        ? (a.project_pin_position ?? 0) - (b.project_pin_position ?? 0)
        : a.project_priority - b.project_priority) ||
      a.project_title.localeCompare(b.project_title),
  );
}
export const taskGroups = {
  overdue: "Overdue",
  "in-process": "In process",
  pending: "Pending",
  completed: "Completed",
};
export function taskGroup(task, day = today()) {
  if (task.task_status === "completed") return "completed";
  if (task.task_due_date && task.task_due_date < day) return "overdue";
  return task.task_status === "in-process" ? "in-process" : "pending";
}
export const sortedTasks = (tasks, day = today()) =>
  [...tasks].sort(
    (a, b) =>
      Object.keys(taskGroups).indexOf(taskGroup(a, day)) -
        Object.keys(taskGroups).indexOf(taskGroup(b, day)) ||
      (a.task_due_date || "9999").localeCompare(b.task_due_date || "9999") ||
      ["high", "medium", "low"].indexOf(a.task_priority) -
        ["high", "medium", "low"].indexOf(b.task_priority) ||
      String(a.task_createdAt || "").localeCompare(
        String(b.task_createdAt || ""),
      ) ||
      a.task_id.localeCompare(b.task_id),
  );
export function matches(task, filter) {
  if (filter.startsWith("status-")) return task.task_status === filter.slice(7);
  if (filter.startsWith("priority-"))
    return task.task_priority === filter.slice(9);
  if (filter === "overdue")
    return (
      !!task.task_due_date &&
      task.task_due_date < today() &&
      task.task_status !== "completed"
    );
  if (filter === "date-today") return task.task_due_date === today();
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (filter === "date-tomorrow")
    return (
      task.task_due_date ===
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  if (filter === "date-this-week") {
    const end = new Date();
    end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
    const key = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    return task.task_due_date >= today() && task.task_due_date <= key;
  }
  return true;
}
export function upsertTask(data, task) {
  if (!data.projects.some((p) => p.project_id === task.task_project))
    throw new Error("Choose an existing project.");
  return {
    ...data,
    projects: data.projects.map((p) => ({
      ...p,
      todoList: [
        ...p.todoList.filter((t) => t.task_id !== task.task_id),
        ...(p.project_id === task.task_project ? [task] : []),
      ],
    })),
  };
}

export function formatDueDate(value) {
  if (!value) return "No due date";
  if (value === today()) return "Today";
  if (matches({ task_due_date: value }, "date-tomorrow")) return "Tomorrow";
  const [year, month, day] = value.split("-").map(Number),
    date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? "No due date"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}
