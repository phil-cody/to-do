import { TODO_STATUS, TODO_PRIORITY } from '@/modules/utils/constants.js';

export const defaultFormTodo = new FormData();
defaultFormTodo.append("todo-title", "Add first task");
defaultFormTodo.append(
  "todo-description",
  "What is the first thing you need to do?",
);
defaultFormTodo.append("todo-dueDate", new Date('2026-01-10'));
defaultFormTodo.append("todo-status", TODO_STATUS.COMPLETED);
defaultFormTodo.append("todo-priority", TODO_PRIORITY.LOW);