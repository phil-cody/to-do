import { orderedProjects, sortedTasks, matches, today } from "./model.js";

export function selectDashboard(
  data,
  { compact = false, search = "", day = today() } = {},
) {
  const projects = orderedProjects(data.projects),
    selected = data.projects.find(
      (project) => project.project_id === data.selectedProjectId,
    ),
    isAll = !selected;
  const allTasks = data.projects.flatMap((project) => project.todoList),
    tasks = isAll ? allTasks : selected.todoList;
  const storedView = isAll ? data.allView : selected.project_view,
    view = compact && storedView === "grid" ? "list" : storedView,
    filter = isAll ? data.allFilter : selected.project_filter;
  const names = new Map(
    projects.map((project) => [project.project_id, project.project_title]),
  );
  const query = search.toLowerCase();
  const shown = sortedTasks(
    tasks.filter(
      (task) =>
        matches(task, filter) &&
        `${task.task_title} ${task.task_description} ${names.get(task.task_project)}`
          .toLowerCase()
          .includes(query),
    ),
    day,
  );
  return {
    projects,
    selected,
    isAll,
    allTasks,
    tasks,
    view,
    filter,
    shown,
    projectTitles: names,
  };
}
