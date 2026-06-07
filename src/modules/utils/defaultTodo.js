import { TODO_STATUS, TODO_PRIORITY } from '@/modules/utils/constants.js';

export const defaultFormTodo = new FormData();
defaultFormTodo.append("task_title", "Add first task");
defaultFormTodo.append(
  "task_description",
  "What is the first thing you need to do?",
);
defaultFormTodo.append("task_due_date", new Date());
defaultFormTodo.append("task_status", TODO_STATUS.COMPLETED);
defaultFormTodo.append("task_priority", TODO_PRIORITY.LOW);