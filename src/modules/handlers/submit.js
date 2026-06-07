import { state } from "@/modules/state/projects";
import { closeDialogs } from "@/modules/utils/closeDialogs";
import { Project } from "@/modules/data/Project";
import { Todo } from "@/modules/data/Todo";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import {
  findProjectIndexByID,
  findTaskIndexByID,
} from "@/modules/utils/findIndexById";
import { DATASET_BTN } from "@/modules/utils/constants";
import { updateProject, createProject } from "@/modules/services/projectService";
import { updateTodo, createTodo } from "@/modules/services/todoService";
import { clearForm } from "@/modules/utils/clearForm";

export const handlerSubmit = () => {

  const addProjectForm = document.querySelector("#addProjectForm");
  const addTaskForm = document.querySelector("#addTaskForm");

  addProjectForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const target = e.target;

    const projectIndex = findProjectIndexByID(state.selectedProjectId);
    const form = new FormData(addProjectForm);
    if (state.currentAction === DATASET_BTN.EDIT_PROJECT) {
      updateProject(state.targetProjectId, form);
    } else if (state.currentAction === DATASET_BTN.ADD_PROJECT) {
      createProject(form);
    }
    state.selectedProjectId = state.projects.at(-1).id;
    closeDialogs();
    renderSidebar();
    renderDashboard();
    clearForm(addProjectForm);
    state.currentAction = null;
  });

  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const projectIndex = findProjectIndexByID(state.selectedProjectId);
    const form = new FormData(addTaskForm);

    console.log(state.projects[projectIndex].todoList)
    
    if (state.currentAction === DATASET_BTN.EDIT_TASK) {
      updateTodo(projectIndex, state.selectedTodoId, form);
    } else if (state.currentAction === DATASET_BTN.ADD_TASK) {
      createTodo(projectIndex, form);
    }
    
    closeDialogs();
    renderSidebar();
    renderDashboard();
    clearForm(addTaskForm);
    state.selectedTodoId = null;
    state.currentAction = null;
  });
};