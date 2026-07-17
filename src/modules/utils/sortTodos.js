import { state } from "@/modules/state/projects";
import { TODO_STATUS, TODO_PRIORITY } from "@/modules/utils/constants.js";
import { isToday, isBefore, isAfter, startOfDay } from "date-fns";

export function sortTodos() {
  state.projects.forEach((project) => {
    const rawArray = project.todoList;

    rawArray.sort(todoWeight);
  });
}

function todoWeight(a, b) {
  const weight = (item) => {
    let dateForSort = item.task_due_date.split("-").slice(1);

    let date =
      isBefore(startOfDay(item.task_due_date), startOfDay(new Date())) &&
      item.task_status !== TODO_STATUS.COMPLETED
        ? 3
        : isToday(item.task_due_date)
          ? 2
          : isAfter(startOfDay(item.task_due_date), startOfDay(new Date())) &&
              item.task_status !== TODO_STATUS.COMPLETED
            ? 2 / ((+dateForSort[0] * 100 + +dateForSort[1]) / 100)
            : item.task_status === TODO_STATUS.COMPLETED
              ? 1 / ((+dateForSort[0] * 100 + +dateForSort[1]) / 100)
              : -1;
    let status =
      item.task_status === TODO_STATUS.COMPLETED
        ? 0
        : item.task_status === TODO_STATUS.PENDING
          ? 1
          : 2;
    let priority =
      item.task_priority === TODO_PRIORITY.LOW
        ? 1
        : item.task_priority === TODO_PRIORITY.MEDIUM
          ? 2
          : 3;
    return Math.floor(date * 10000) * 100 + status * 10 + priority;
  };

  return weight(b) - weight(a);
}
