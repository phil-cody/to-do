import { state } from "@/modules/state/projects";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import { format } from "date-fns";
import { clearSection } from "@/modules/UI/clearSection";
import { closeDialogs } from '@/modules/utils/closeDialogs';
import { DATASET_BTN } from "@/modules/utils/constants";
import {
  findProjectIndexByID,
  findTaskIndexByID,
} from "@/modules/utils/findProjectIndexById";
import { TODO_PRIORITY } from "@/modules/utils/constants";
import { renderTodoFull } from "@/modules/UI/renderTodoFull";
import { deleteProject } from "@/modules/services/projectService";
import { deleteTodo } from "@/modules/services/todoService";

export const handlerClick = () => {
  const dialogNewProject = document.querySelector("#new-project");
  const dialogNewTask = document.querySelector("#new-task");
  const dialogFullTask = document.querySelector('#todo-full');

  document.addEventListener("click", (e) => {
    const target = e.target;

    if (!target.closest("button") && !target.closest(".project-item")) {
      return;
    }

    if (target.closest(".project-item")) {
      state.selectedProjectId = target.closest(".project-item").id;
      renderSidebar();
      renderDashboard();
    }

    if (target.closest("button")) {
      switch (target.dataset.btn) {
        case DATASET_BTN.ADD_PROJECT:
          closeDialogs();
          dialogNewProject.showModal();
          break;
        case DATASET_BTN.ADD_TASK:
          closeDialogs();
          dialogNewTask.showModal();
          break;
        case DATASET_BTN.EDIT_PROJECT:
          closeDialogs();
          dialogNewProject.showModal();
          dialogNewProject
            .querySelector("#project-title")
            .setAttribute(
              "value",
              state.projects[findProjectIndexByID(state.selectedProjectId)]
                .title,
            );
          dialogNewProject
            .querySelector("#project-description")
            .setAttribute(
              "value",
              state.projects[findProjectIndexByID(state.selectedProjectId)]
                .description,
            );
          break;
        case DATASET_BTN.EDIT_TASK:
          closeDialogs();
          dialogNewTask.showModal();
          dialogNewTask
            .querySelector("#task-title")
            .setAttribute(
              "value",
              state.projects[findProjectIndexByID(state.selectedProjectId)]
                .todoList[findTaskIndexByID(target.closest(".todo-item").id)]
                .title,
            );
          dialogNewTask
            .querySelector("#task-description")
            .setAttribute(
              "value",
              state.projects[findProjectIndexByID(state.selectedProjectId)]
                .todoList[findTaskIndexByID(target.closest(".todo-item").id)]
                .description,
            );
          dialogNewTask
            .querySelector("#task-due-date")
            .setAttribute(
              "value",
              format(
                state.projects[findProjectIndexByID(state.selectedProjectId)]
                  .todoList[findTaskIndexByID(target.closest(".todo-item").id)]
                  .dueDate,
                "yyyy-MM-dd",
              ),
            );
          dialogNewTask
            .querySelector(
              `option[value=${
                state.projects[findProjectIndexByID(state.selectedProjectId)]
                  .todoList[findTaskIndexByID(target.closest(".todo-item").id)]
                  .status
              }]`,
            )
            .setAttribute("selected", "");
          dialogNewTask
            .querySelector(
              `option[value=${
                state.projects[findProjectIndexByID(state.selectedProjectId)]
                  .todoList[findTaskIndexByID(target.closest(".todo-item").id)]
                  .priority
              }]`,
            )
            .setAttribute("selected", "");
          break;
        case DATASET_BTN.DELETE_PROJECT:
          deleteProject(findProjectIndexByID(target.closest(".project-item").id));
          if (state.projects.length === 0) {
            state.selectedProjectId = null;
          }
          renderSidebar();
          renderDashboard();
          break;
        case DATASET_BTN.DELETE_TASK:
          deleteTodo(state.selectedProjectId, findProjectIndexByID(target.closest(".todo-item").id));
          if (dialogFullTask.hasAttribute('open')) closeDialogs();
          renderSidebar();
          renderDashboard();
          break;
        case DATASET_BTN.CLOSE_DIALOG:
          closeDialogs();
          break;
        case DATASET_BTN.SHOW_TASK:
          clearSection(dialogFullTask);
          dialogFullTask.appendChild(renderTodoFull(state.projects[findProjectIndexByID(state.selectedProjectId)]
                .todoList[findTaskIndexByID(target.closest(".todo-item").id)]));
          dialogFullTask.showModal();
          break;
      }
    }
  });
};