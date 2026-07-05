import { getProjectById } from "@/modules/services/projectService";
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
  const checkResult = checkSameTodoTitle(
    projectIndex,
    todoId,
    Object.fromEntries(form),
  );

  if (todo.task_project !== Object.fromEntries(form).task_project) moveTodo(todoId, todo.task_project, Object.fromEntries(form).task_project);

  if (!todo) return null;
  if (!checkResult) return null;

  todo.update(Object.fromEntries(form));

  return todo;
};

export const deleteTodo = (projectId, idToDelete) => {
  const index = state.projects[
    findProjectIndexByID(projectId)
  ].todoList.findIndex((todo) => todo.task_id === idToDelete);

  if (index === -1) return null;

  return state.projects[findProjectIndexByID(projectId)].todoList.splice(
    index,
    1,
  )[0];
};

export const moveTodo = (todoId, sourceProjectId, targetProjectId) => {
  if (sourceProjectId === targetProjectId) return;

  const sourceProject = getProjectById(sourceProjectId);
  const targetProject = getProjectById(targetProjectId);

  const todo = deleteTodo(sourceProjectId, todoId);
  
  todo.updateTodoProject(targetProjectId);
  targetProject.todoList.push(todo);
}