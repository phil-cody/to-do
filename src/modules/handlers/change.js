import {
  TODO_STATUS,
  TODO_PRIORITY,
  DATASET_BTN,
} from "@/modules/utils/constants.js";
import { Todo } from "@/modules/data/Todo";
import { state } from "@/modules/state/projects";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";

export const handlerChange = (select, todo = null) => {
  if (todo) {
    select.addEventListener("change", (event) => {
      const target = event.target;

      switch (target.name) {
        case "status":
          todo.updateStatus(target.value);
          break;
        case "priority":
          todo.updatePriority(target.value);
          break;
      }

      renderSidebar();
      renderDashboard();
    });
  } else {
    select.addEventListener("change", (event) => {
      const target = event.target;

      const box = document.querySelector(".todo");

      box.className = `todo ${target.value}`;
    });
  }
};
