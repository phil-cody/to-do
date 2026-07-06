import { state } from "@/modules/state/projects";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import { format } from "date-fns";
import { clearSection } from "@/modules/UI/clearSection";
import { closeDialogs } from "@/modules/utils/closeDialogs";
import { DATASET_BTN, TODO_PRIORITY } from "@/modules/utils/constants";
import { toggleSelectedProject } from "@/modules/utils/toggleSelectedProject";
import {
  findProjectIndexByID,
  findTaskIndexByID,
} from "@/modules/utils/findIndexById";
import { renderTodoFull } from "@/modules/UI/renderTodoFull";
import {
  deleteProject,
  getProjectById,
  updatePriority,
} from "@/modules/services/projectService";
import { deleteTodo, getTodoById } from "@/modules/services/todoService";
import { clearForm } from "@/modules/utils/clearForm";
import { pullOutLocalStorage } from "@/modules/storage/pullOutLocalStorage";
import { pushInLocalStorage } from "@/modules/storage/pushInLocalStorage";
import { sortTodos } from "@/modules/utils/sortTodos";
import { maxProjectPriority } from "@/modules/utils/maxProjectPriority";
import { renderProjectSelect } from "@/modules/UI/renderProjectSelect";

export const handlerClick = () => {
  const dialogNewProject = document.querySelector("#new-project");
  const dialogNewTask = document.querySelector("#new-task");
  const dialogFullTask = document.querySelector("#todo-full");

  document.addEventListener("click", (e) => {
    const target = e.target;

    if (!target.closest("button") && !target.closest(".project-item")) {
      return;
    }

    if (
      target.closest(".project-item") &&
      target.tagName !== "BUTTON" &&
      target.closest(".project-item").id !== state.selectedProjectId
    ) {
      state.selectedProjectId = target.closest(".project-item").id;
      renderSidebar();
      toggleSelectedProject(state.selectedProjectId);
      renderDashboard();
      pushInLocalStorage(state);
    }

    if (target.closest("button")) {
      switch (target.dataset.btn) {
        case DATASET_BTN.ADD_PROJECT:
          state.currentAction = DATASET_BTN.ADD_PROJECT;
          maxProjectPriority();
          closeDialogs();
          dialogNewProject.showModal();
          break;
        case DATASET_BTN.ADD_TASK:
          state.currentAction = DATASET_BTN.ADD_TASK;
          closeDialogs();
          renderProjectSelect();
          dialogNewTask.showModal();
          break;
        case DATASET_BTN.EDIT_PROJECT:
          state.currentAction = DATASET_BTN.EDIT_PROJECT;
          maxProjectPriority();
          state.targetProjectId = target.closest(".project-item").id;
          closeDialogs();
          dialogNewProject.showModal();
          Array.from(dialogNewProject.querySelector("form").elements).forEach(
            (field) => {
              if (field.tagName !== "BUTTON") {
                let name = field.name;
                field.value = getProjectById(state.targetProjectId)[name];
              }
            },
          );
          break;
        case DATASET_BTN.EDIT_TASK:
          state.selectedTodoId = target.closest(".todo-item").id;
          state.currentAction = DATASET_BTN.EDIT_TASK;
          closeDialogs();
          renderProjectSelect();
          dialogNewTask.showModal();
          let currentTaskId = target.closest(".todo-item").id;
          Array.from(dialogNewTask.querySelector("form").elements).forEach(
            (field) => {
              if (field.tagName !== "BUTTON") {
                let name = field.name;
                field.value = getTodoById(
                  findProjectIndexByID(state.selectedProjectId),
                  currentTaskId,
                )[name];
              }
            },
          );
          break;
        case DATASET_BTN.DELETE_PROJECT:
          if (state.projects.length === 1) {
            alert("Can't delete last project");
            return;
          }
          if (target.closest(".project-item").id === state.selectedProjectId) {
            state.selectedProjectId = state.projects[0].project_id;
            toggleSelectedProject();
          }
          const deleteProjectPriority =
            state.projects[
              findProjectIndexByID(target.closest(".project-item").id)
            ].project_priority;

          deleteProject(target.closest(".project-item").id);
          state.projects.forEach((project) => {
            if (project.project_priority >= deleteProjectPriority) {
              project.project_priority = +project.project_priority - 1;
            }
          });
          pushInLocalStorage(state);
          localStorage.removeItem(target.closest(".project-item").id);
          renderDashboard();
          renderSidebar();
          break;
        case DATASET_BTN.DELETE_TASK:
          deleteTodo(state.selectedProjectId, target.closest(".todo-item").id);
          if (dialogFullTask.hasAttribute("open")) closeDialogs();
          pushInLocalStorage(state);
          renderSidebar();
          renderDashboard();
          break;
        case DATASET_BTN.CLOSE_DIALOG:
          closeDialogs();
          if (target.closest(".dialog-container").querySelector("form"))
            clearForm(
              target.closest(".dialog-container").querySelector("form"),
            );
          state.selectedTodoId = null;
          state.currentAction = null;
          break;
        case DATASET_BTN.SHOW_TASK:
          clearSection(dialogFullTask);
          dialogFullTask.appendChild(
            renderTodoFull(
              state.projects[findProjectIndexByID(state.selectedProjectId)]
                .todoList[findTaskIndexByID(target.closest(".todo-item").id)],
            ),
          );
          dialogFullTask.showModal();
          console.log(state)
          break;
      }
    }
  });
};
