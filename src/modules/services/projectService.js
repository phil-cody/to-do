import { Project } from "@/modules/data/Project";
import { state } from "@/modules/state/projects";

export const getTodoListByProjectId = (projectId) => {
  return state.projects.find((project) => project.project_id === projectId).todoList;
}

export const getProjectById = (projectId) => {
  const result = state.projects.find((project) => project.project_id === projectId);
  return result;
};

export const updateProject = (projectId, form) => {
  const project = getProjectById(projectId);
  if (!project) return null;

  project.update(Object.fromEntries(form));
  return project;
};

export const deleteProject = (idToDelete) => {
  state.projects = state.projects.filter((project) => project.project_id !== idToDelete);
};
