import { Todo } from "@/modules/data/Todo";
import { state } from "@/modules/state/projects";
import { findProjectIndexByID } from "@/modules/utils/findIndexById";
import { checkSameTodoTitle } from "@/modules/utils/checkSameTitle";

export const getTodoById = (projectIndex, todoId) => {
  return state.projects[projectIndex].todoList.find(
    (todo) => todo.task_id === todoId,
  );
};

export const updateTodo = (projectIndex, todoId, form) => {
  const todo = getTodoById(projectIndex, todoId);
  const checkResult = checkSameTodoTitle(projectIndex, todoId, Object.fromEntries(form));

  if (!todo) return null;
  if (!checkResult) return null;
  
  todo.update(Object.fromEntries(form));

  return todo;
};

export const deleteTodo = (projectId, idToDelete) => {
  state.projects[findProjectIndexByID(projectId)].todoList = state.projects[
    findProjectIndexByID(projectId)
  ].todoList.filter((todo) => todo.task_id !== idToDelete);
};
