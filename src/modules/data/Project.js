import { Todo } from "@/modules/data/Todo";
import { defaultFormTodo } from "@/modules/utils/defaultTodo";
import {
  filterOverdue,
  filterToday,
  filterCompleted,
} from "@/modules/utils/filterTasks";

export class Project {
  constructor(form) {
    this.project_title = form.get("project_title");
    this.project_description = form.get("project_description");
    this.todoList = [new Todo(defaultFormTodo)];
    this.createdAt = new Date();
    this.id = crypto.randomUUID();
  }

  get allTasks() {
    return this.todoList.length;
  }

  get overdueTasks() {
    return this.todoList.filter((todo) =>
      filterOverdue(todo.task_due_date, todo.task_status),
    ).length;
  }

  get todayTasks() {
    return this.todoList.filter((todo) =>
      filterToday(todo.task_due_date),
    ).length;
  }

  get completedTasks() {
    return this.todoList.filter((todo) =>
      filterCompleted(todo.task_status),
    ).length;
  }
}
