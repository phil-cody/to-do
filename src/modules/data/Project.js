import {
  filterOverdue,
  filterToday,
  filterTomorrow,
  filterThisWeek,
  filterCompleted,
  filterInProcess,
  filterPending,
  filterPriorityHigh,
  filterPriorityMedium,
  filterPriorityLow,
} from "@/modules/utils/filterTasks";
import { Todo } from "@/modules/data/Todo";
import {
  DASHBOARD_VIEW,
  DASHBOARD_FILTER,
  TODO_STATUS,
} from "@/modules/utils/constants.js";

export class Project {
  constructor(data, project_pinned = false, project_type = Project.TYPES.CUSTOM) {
    Object.assign(this, data);
    this.project_pinned = project_pinned;
    this.project_type = project_type;
  }

  static fromForm(form) {
    const data = new FormData(form);
    return new Project({
      project_title: data.get("project_title"),
      project_description: data.get("project_description"),
      project_priority: +data.get("project_priority"),
      project_view: DASHBOARD_VIEW.GRID,
      project_filter: DASHBOARD_FILTER.ALL,
      project_pinned: false,
      project_type: Project.TYPES.CUSTOM,
      todoList: [],
      createdAt: new Date(),
      project_id: crypto.randomUUID(),
    });
  }

  static fromStorage(data) {
    return new Project({
      ...data,
      todoList: data.todoList.map((todo) => Todo.fromStorage(todo)),
      project_priority: Number(data.project_priority),
      project_pinned: data.project_pinned ?? false,
      project_type: data.project_type ?? Project.TYPES.CUSTOM,
    });
  }

  static TYPES = {
    CUSTOM: 'custom',
    INBOX: 'inbox'
  }

  static inbox() {
    return new Project({
      project_title: "Inbox",
      project_description: "Quick tasks",

      project_priority: 1,
      project_view: DASHBOARD_VIEW.GRID,
      project_filter: DASHBOARD_FILTER.ALL,

      project_pinned: true,
      project_type: Project.TYPES.INBOX,

      todoList: [],

      createdAt: new Date(),
      project_id: crypto.randomUUID(),
    });
  }

  get isInbox() {
    return this.project_type === Project.TYPES.INBOX;
  }

  updateView(value) {
    this.project_view = value;
  }

  updateFilter(value) {
    this.project_filter = value;
  }

  update(updates) {
    Object.assign(this, updates);
  }

  showAllTasks() {
    return this.todoList;
  }

  showCompletedTasks() {
    return this.todoList.filter((todo) => filterCompleted(todo.task_status));
  }

  showPendingTasks() {
    return this.todoList.filter((todo) => filterPending(todo.task_status));
  }

  showInProcessTasks() {
    return this.todoList.filter((todo) => filterInProcess(todo.task_status));
  }

  showOverdueTasks() {
    return this.todoList.filter((todo) => filterOverdue(todo.task_due_date, todo.task_status));
  }

  showPriorityHighTasks() {
    return this.todoList.filter((todo) =>
      filterPriorityHigh(todo.task_priority),
    );
  }

  showPriorityMediumTasks() {
    return this.todoList.filter((todo) =>
      filterPriorityMedium(todo.task_priority),
    );
  }

  showPriorityLowTasks() {
    return this.todoList.filter((todo) =>
      filterPriorityLow(todo.task_priority),
    );
  }

  showTodayTasks() {
    return this.todoList.filter((todo) => filterToday(todo.task_due_date));
  }

  showTomorrowTasks() {
    return this.todoList.filter((todo) => filterTomorrow(todo.task_due_date));
  }

  showThisWeekTasks() {
    return this.todoList.filter((todo) => filterThisWeek(todo.task_due_date));
  }

  get allTasks() {
    return this.todoList.length;
  }

  get overdueTasks() {
    return this.todoList.filter((todo) => {
      return filterOverdue(todo.task_due_date, todo.task_status);
    }).length;
  }

  get todayTasks() {
    return this.todoList.filter((todo) => {
      if (todo.task_status === TODO_STATUS.COMPLETED) return false;
      return filterToday(todo.task_due_date);
    }).length;
  }

  get completedTasks() {
    return this.todoList.filter((todo) => filterCompleted(todo.task_status))
      .length;
  }
}
