import { state } from "@/modules/state/projects";

export function checkSameProjectTitle(projectId, projectToCompare) {
  const titleToCompare = projectToCompare.project_title;
  if (state.projects.length < 1) return true;

  for (let i = 0; i < state.projects.length; i++) {
    if (state.projects[i].project_title === titleToCompare && state.projects[i].project_id !== projectId) return false;
  }

  return true;
}

export function checkSameTodoTitle(projectIndex, todoId, todoToCompare) {
  const titleToCompare = todoToCompare.task_title;
  if (state.projects[projectIndex].todoList.length < 1) return true;

  for (let i = 0; i < state.projects[projectIndex].todoList.length; i++) {
    if (state.projects[projectIndex].todoList[i].task_title === titleToCompare && state.projects[projectIndex].todoList[i].task_id !== todoId) return false;
  }

  return true;
}