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
import { pushInLocalStorage } from "@/modules/storage/pushInLocalStorage";
import { pullOutLocalStorage } from "@/modules/storage/pullOutLocalStorage";
import { checkSameProjectTitle, checkSameTodoTitle } from "@/modules/utils/checkSameTitle";

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
      let newProject = Project.fromForm(addProjectForm)
      if (checkSameProjectTitle(newProject.project_id, newProject)) {
        state.projects.push(newProject);
      } else {
        alert(`The project could not be created because a project with the same name already exists. 
Please try giving a different name to the project.`);
        return;
      }
    }
    state.selectedProjectId = state.projects.at(-1).project_id;
    pushInLocalStorage(state.projects)
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
    
    if (state.currentAction === DATASET_BTN.EDIT_TASK) {
      updateTodo(projectIndex, state.selectedTodoId, form);
    } else if (state.currentAction === DATASET_BTN.ADD_TASK) {
      let newTodo = Todo.fromForm(addTaskForm);
      if (checkSameTodoTitle(projectIndex, newTodo.task_id, newTodo)) {
        state.projects[projectIndex].todoList.push(Todo.fromForm(addTaskForm));
      } else {
        alert(`The task could not be created because a task with the same name already exists. 
Please try giving the task a different name`);
        return;
      }
    }
    
    closeDialogs();
    pushInLocalStorage(state.projects)
    renderSidebar();
    renderDashboard();
    clearForm(addTaskForm);
    state.selectedTodoId = null;
    state.currentAction = null;
  });
};