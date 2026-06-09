export class Todo {
  constructor(form) {
    Object.assign(this, form);
  }

  static fromForm(form) {
    const data = new FormData(form);
    return new Todo({
      task_title: data.get("task_title"),
      task_description: data.get("task_description"),
      task_due_date: data.get("task_due_date"),
      task_status: data.get("task_status"),
      task_priority: data.get("task_priority"),
      task_createdAt: new Date(),
      task_id: crypto.randomUUID(),
    });
  }

  static fromData(data) {
    return new Todo(data);
  }

  static fromStorage(data) {
    return new Todo(data);
  }

  update(updates) {
    Object.assign(this, updates);
  }

  updateStatus(value) {
    this.task_status = value;
  }

  updatePriority(value) {
    this.task_priority = value;
  }
}
