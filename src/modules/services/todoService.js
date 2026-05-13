import { Todo } from "@/modules/data/Todo";
import { state } from "@/modules/state/projects";
import { findProjectIndexByID } from '@/modules/utils/findProjectIndexById';

export const createTodo = (form, projectIndex) => {
  const todo = new Todo(form);

  state.projects[projectIndex].todoList.push(todo);
};

export const getTodoById = (projectIndex, todoId) => {
  return state.projects[projectIndex].find((todo) => todo.id === todoId);
};

export const updateTodo = (projectIndex, todoId, form) => {
  const todo = getTodoById(projectIndex, todoId);
  const updates = new FormData(form);

  return Object.assign(todo, updates);
};

export const deleteTodo = (projectIndex, idToDelete) => {

  state.projects[projectIndex] = state.projects[projectIndex].todoList.filter(
    (todo) => todo.id !== idToDelete,
  );
};
