import { state } from '@/modules/state/projects';

export const findProjectIndexByID = (currentId) => {
  const result = state.projects.findIndex(project => project.id === currentId);
  return result;
}

export const findTaskIndexByID = (currentId) => {
  const result = state.projects[findProjectIndexByID(state.selectedProjectId)].todoList.findIndex(todo => todo.task_id === currentId); 
  return result;
}