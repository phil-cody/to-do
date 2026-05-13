import { Todo } from "@/modules/data/Todo";
import { defaultFormTodo } from "@/modules/utils/defaultTodo";
import { filterOverdue, filterToday, filterCompleted } from '@/modules/utils/filterTasks';

export class Project {
  
  constructor(form) {
    this.title = form.get("project-title");
    this.description = form.get("project-description");
    this.todoList = [new Todo(defaultFormTodo)];
    this.allTasks = this.todoList.length;
    this.overdueTasks = this.todoList.filter(todo => filterOverdue(todo.dueDate, todo.status)).length;
    this.todayTasks = this.todoList.filter(todo => filterToday(todo.dueDate)).length;
    this.completedTasks = this.todoList.filter(todo => filterCompleted(todo.status)).length;
    this.createdAt = new Date();
    this.id = crypto.randomUUID();
  }
}