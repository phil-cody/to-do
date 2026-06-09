import { state } from "@/modules/state/projects";
import { TODO_STATUS, TODO_PRIORITY } from "@/modules/utils/constants.js";
import { isToday, isBefore, startOfDay } from "date-fns";

export function sortTodos() {
  state.projects.forEach((project) => {
    const rawArray = project.todoList;

    rawArray.sort(todoWeight);
  });
}

function todoWeight(a, b) {
  const weight = (item) => {
    let date =
      isBefore(startOfDay(item.task_due_date), startOfDay(new Date())) &&
      item.task_status !== TODO_STATUS.COMPLETED
        ? 3
        : isToday(item.task_due_date)
          ? 2
          : isBefore(item.task_due_date)
            ? 0
            : 1;
    let status =
      item.task_status === TODO_STATUS.COMPLETED
        ? 0
        : item.task_status === TODO_STATUS.PENDING
          ? 1
          : 2;
    let priority =
      item.task_priority === TODO_PRIORITY.LOW
        ? 0
        : item.task_priority === TODO_PRIORITY.MEDIUM
          ? 1
          : 2;

    return status === 0 ? 0 : date * 100 + status * 10 + priority;
  };

  return weight(b) - weight(a);
}
