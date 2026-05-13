import { state } from '@/modules/state/projects';

export const findProjectIndexByID = (currentId) => {
  return state.projects.findIndex(project => project.id === currentId);
}

export const findTaskIndexByID = (currentId) => {
  return state.projects[findProjectIndexByID(state.selectedProjectId)].todoList.findIndex(todo => todo.id === currentId);
}