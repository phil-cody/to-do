import {
  TODO_STATUS,
  TODO_PRIORITY,
  DATASET_BTN,
} from "@/modules/utils/constants.js";
import { format, isToday, isTomorrow } from "date-fns";
import { handlerChange } from "@/modules/handlers/change";
import { Todo } from "@/modules/data/Todo";
import { state } from "@/modules/state/projects";
import {
  findProjectIndexByID,
  findTaskIndexByID,
} from "@/modules/utils/findIndexById";

export const renderProjectSelect = () => {
  const selectBox = document.getElementById("task_project");
  let data = JSON.parse(localStorage.getItem("todo_app"));

  data.forEach((project) => {
    const todoProjectOption = document.createElement("option");
    todoProjectOption.setAttribute("value", project.project_id);
    todoProjectOption.textContent = project.project_title;
    selectBox.appendChild(todoProjectOption);

    if (project.project_id === state.selectedProjectId) {
      todoProjectOption.setAttribute("selected", "");
    }
  });
};
