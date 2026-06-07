import { Project } from "@/modules/data/Project";
import { state } from "@/modules/state/projects";

export const createProject = (form) => {
  const project = new Project(form);

  state.projects.push(project);
};

export const getTodoListByProjectId = (projectId) => {
  return state.projects.find((project) => project.id === projectId).todoList;
}

export const getProjectById = (projectId) => {
  const result = state.projects.find((project) => project.id === projectId);
  return result;
};

export const getAllProjects = () => {
  return state.projects;
}

export const updateProject = (projectId, form) => {
  const project = getProjectById(projectId);
  const updates = Object.fromEntries(form);
  return updates ? Object.assign(project, updates) : project;
};

export const deleteProject = (idToDelete) => {
  state.projects = state.projects.filter((project) => project.id !== idToDelete);
};
