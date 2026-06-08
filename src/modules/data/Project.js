import {
  filterOverdue,
  filterToday,
  filterCompleted,
} from "@/modules/utils/filterTasks";

export class Project {
  constructor(data) {
    Object.assign(this, data);
  }

  static fromForm(form) {
    const data = new FormData(form);
    return new Project({
      project_title: data.get("project_title"),
      project_description: data.get("project_description"),
      todoList: [],
      createdAt: new Date(),
      project_id: crypto.randomUUID(),
    });
  }

  static fromStorage(data) {
    return new Project(data);
  }

  static defaultProject() {
    return new Project({
      project_title: "To-Do List",
      project_description: "Current To-Do List",
      todoList: [],
      createdAt: new Date(),
      project_id: crypto.randomUUID(),
    });
  }

  update(updates) {
    console.trace()
    Object.assign(this, updates);
  }

  get allTasks() {
    return this.todoList.length;
  }

  get overdueTasks() {
    return this.todoList.filter((todo) => {
      filterOverdue(todo.task_due_date, todo.task_status)},
    ).length;
  }

  get todayTasks() {
    return this.todoList.filter((todo) => filterToday(todo.task_due_date))
      .length;
  }

  get completedTasks() {
    return this.todoList.filter((todo) => filterCompleted(todo.task_status))
      .length;
  }
}
