import { TODO_STATUS, TODO_PRIORITY } from '@/modules/utils/constants.js';

export const defaultTodo = {
  task_title: "Add first task",
  task_description: "What is the first thing you need to do?",
  task_due_date: new Date().toISOString(),
  task_status: TODO_STATUS.PENDING,
  task_priority: TODO_PRIORITY.HIGH,
  task_createdAt: new Date(),
  task_id: crypto.randomUUID(),
};