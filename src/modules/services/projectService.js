import { Project } from "@/modules/data/Project";
import { state } from "@/modules/state/projects";
import { checkSameProjectTitle } from "@/modules/utils/checkSameTitle";

export const getTodoListByProjectId = (projectId) => {
  return state.projects.find((project) => project.project_id === projectId)
    .todoList;
};

export const getProjectById = (projectId) => {
  const result = state.projects.find(
    (project) => project.project_id === projectId,
  );
  return result;
};

export const updateProject = (projectId, form) => {
  const project = getProjectById(projectId);
  const checkResult = checkSameProjectTitle(
    projectId,
    Object.fromEntries(form),
  );

  if (!project) return null;
  
  updatePriority(projectId, +Object.fromEntries(form).project_priority);
  project.update(Object.fromEntries(form));
  return project;
};

export const deleteProject = (idToDelete) => {
  state.projects = state.projects.filter(
    (project) => project.project_id !== idToDelete,
  );
};

export const updatePriority = (projectId, newPriority) => {
  const project = getProjectById(projectId);

  const oldPriority = project.project_priority;

  if (oldPriority === newPriority) {
    return;
  } else if (newPriority < oldPriority) {
    state.projects.forEach((item) => {
      if (
        item.project_priority >= newPriority &&
        item.project_priority < oldPriority
      ) {
        item.project_priority = +item.project_priority + 1;
      }
    });
  } else if (newPriority > oldPriority) {
    state.projects.forEach((item) => {
      if (
        item.project_priority <= newPriority &&
        item.project_priority > oldPriority
      ) {
        item.project_priority = +item.project_priority - 1;
      }
    });
  }

  project.project_priority = newPriority;
};
