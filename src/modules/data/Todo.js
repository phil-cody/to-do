import { state } from '@/modules/state/projects';

export class Todo {
  constructor(form) {
    this.title = form.get('todo-title');
    this.description = form.get('todo-description');
    this.dueDate = form.get('todo-dueDate');
    this.status = form.get('todo-status');
    this.priority = form.get('todo-priority');
    this.createdAt = new Date();
    this.id = crypto.randomUUID();
  }
}