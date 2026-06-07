import { Todo } from "@/modules/data/Todo";
import { state } from "@/modules/state/projects";
import { findProjectIndexByID } from "@/modules/utils/findIndexById";

export const createTodo = (projectIndex, form) => {  
  const todo = new Todo(form);

  state.projects[projectIndex].todoList.push(todo);
};

export const getTodoById = (projectIndex, todoId) => {
  return state.projects[projectIndex].todoList.find(
    (todo) => todo.task_id === todoId,
  );
};

export const updateTodo = (projectIndex, todoId, form) => {
  const todo = getTodoById(projectIndex, todoId);
  const updates = Object.fromEntries(form);

  return updates ? Object.assign(todo, updates) : todo;
};

export const deleteTodo = (projectId, idToDelete) => {
  state.projects[findProjectIndexByID(projectId)].todoList = state.projects[
    findProjectIndexByID(projectId)
  ].todoList.filter((todo) => todo.task_id !== idToDelete);
};
