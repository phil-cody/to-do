import { today, upsertTask } from "./model.js";

export function newTask(projectId) {
  return {
    task_id: crypto.randomUUID(),
    task_title: "",
    task_description: "",
    task_due_date: today(),
    task_status: "pending",
    task_priority: "low",
    task_project: projectId,
    task_createdAt: new Date().toISOString(),
  };
}
export function newProject(projects) {
  return {
    project_id: crypto.randomUUID(),
    project_title: "",
    project_description: "",
    project_priority:
      Math.max(...projects.map((project) => project.project_priority)) + 1,
    project_pinned: false,
    project_type: "custom",
    project_view: "grid",
    project_filter: "all",
    todoList: [],
    createdAt: new Date().toISOString(),
  };
}
export function setPreference(data, key, value) {
  if (data.selectedProjectId === "all")
    return {
      ...data,
      [key === "project_view" ? "allView" : "allFilter"]: value,
    };
  return {
    ...data,
    projects: data.projects.map((project) =>
      project.project_id === data.selectedProjectId
        ? { ...project, [key]: value }
        : project,
    ),
  };
}
export function toggleProjectPin(data, id) {
  const position =
    Math.max(
      0,
      ...data.projects
        .filter((project) => project.project_pinned)
        .map((project) => project.project_pin_position || 0),
    ) + 1;
  return {
    ...data,
    projects: data.projects.map((project) =>
      project.project_id === id
        ? {
            ...project,
            project_pinned: !project.project_pinned,
            project_pin_position: position,
          }
        : project,
    ),
  };
}
export function saveProject(data, item) {
  if (
    data.projects.some(
      (project) =>
        project.project_id !== item.project_id &&
        project.project_title.toLowerCase() ===
          item.project_title.toLowerCase(),
    )
  )
    throw new Error("A project with this name already exists.");
  const exists = data.projects.some(
    (project) => project.project_id === item.project_id,
  );
  return {
    ...data,
    selectedProjectId: item.project_id,
    projects: exists
      ? data.projects.map((project) =>
          project.project_id === item.project_id ? item : project,
        )
      : [...data.projects, item],
  };
}
export function removeProject(data, id) {
  const project = data.projects.find((project) => project.project_id === id);
  if (!project) return data;
  if (project.project_type === "inbox" || data.projects.length === 1)
    throw new Error("Inbox and the last project cannot be deleted.");
  return {
    ...data,
    selectedProjectId:
      data.selectedProjectId === id ? "all" : data.selectedProjectId,
    projects: data.projects.filter((project) => project.project_id !== id),
  };
}
export function removeTask(data, id) {
  return {
    ...data,
    projects: data.projects.map((project) => ({
      ...project,
      todoList: project.todoList.filter((task) => task.task_id !== id),
    })),
  };
}
export function saveItem(data, kind, item) {
  return kind === "task" ? upsertTask(data, item) : saveProject(data, item);
}
