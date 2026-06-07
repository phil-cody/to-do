import { state } from '@/modules/state/projects';
import {
  format
} from "date-fns";

export class Todo {
  constructor(form) {
    this.task_title = form.get('task_title');
    this.task_description = form.get('task_description');
    this.task_due_date = format(form.get('task_due_date'), 'yyyy-MM-dd');
    this.task_status = form.get('task_status');
    this.task_priority = form.get('task_priority');
    this.task_createdAt = new Date();
    this.task_id = crypto.randomUUID();
  }

  updateStatus(value) {
    this.task_status = value;
  }

  updatePriority(value) {
    this.task_priority = value;
  }
}