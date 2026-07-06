import {
  TODO_STATUS,
  TODO_PRIORITY,
  DASHBOARD_FILTER,
  DATASET_BTN,
} from "@/modules/utils/constants.js";
import { Todo } from "@/modules/data/Todo";
import { Project } from "@/modules/data/Project";
import { state } from "@/modules/state/projects";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import { pushInLocalStorage } from "@/modules/storage/pushInLocalStorage";
import { findProjectIndexByID } from "@/modules/utils/findIndexById";
import { sortTodos } from "@/modules/utils/sortTodos";
import { updateTodo } from "@/modules/services/todoService";

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
        case "project":
          const form = new FormData();
          form.set('task_project', target.value);
          let projectIndex = findProjectIndexByID(todo.task_project);
          updateTodo(projectIndex, todo.task_id, form);
          
          break;
      }
      sortTodos();
      renderSidebar();
      renderDashboard();
      pushInLocalStorage(state);
    });
  } else {
    select.addEventListener("change", (event) => {
      const target = event.target;

      const box = document.querySelector(".todo");
      if (target.id === "select-view") {
        state.projects[
          findProjectIndexByID(state.selectedProjectId)
        ].updateView(target.value);
        box.className = `todo ${target.value}`;
      } else if (target.id === "select-filter") {
        state.projects[
          findProjectIndexByID(state.selectedProjectId)
        ].updateFilter(target.value);
        renderDashboard();
      }
      pushInLocalStorage(state);
    });
  }
};
