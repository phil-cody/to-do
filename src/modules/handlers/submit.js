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
import {
  updateProject,
  createProject,
} from "@/modules/services/projectService";
import { updateTodo, createTodo } from "@/modules/services/todoService";
import { clearForm } from "@/modules/utils/clearForm";
import { pushInLocalStorage } from "@/modules/storage/pushInLocalStorage";
import { pullOutLocalStorage } from "@/modules/storage/pullOutLocalStorage";
import {
  checkSameProjectTitle,
  checkSameTodoTitle,
} from "@/modules/utils/checkSameTitle";
import { sortTodos } from "@/modules/utils/sortTodos";
import { maxProjectPriority } from "@/modules/utils/maxProjectPriority";

export const handlerSubmit = () => {
  const addProjectForm = document.querySelector("#addProjectForm");
  const addTaskForm = document.querySelector("#addTaskForm");

  addProjectForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const target = e.target;

    const form = new FormData(addProjectForm);
    if (state.currentAction === DATASET_BTN.EDIT_PROJECT) {
      state.selectedProjectId = state.targetProjectId;
      updateProject(state.targetProjectId, form);
    } else if (state.currentAction === DATASET_BTN.ADD_PROJECT) {
      let newProject = Project.fromForm(addProjectForm);
      if (checkSameProjectTitle(newProject.project_id, newProject)) {
        state.projects.forEach((project) => {
          if (project.project_priority >= newProject.project_priority) {
            project.project_priority = +project.project_priority + 1;
          }
        });
        state.selectedProjectId = newProject.project_id;
        state.projects.push(newProject);
      } else {
        alert(`The project could not be created because a project with the same name already exists. 
Please try giving a different name to the project.`);
        return;
      }
    }
    pushInLocalStorage(state);
    closeDialogs();
    renderSidebar();
    renderDashboard();
    clearForm(addProjectForm);
    maxProjectPriority();
    state.currentAction = null;
  });

  addTaskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    let projectIndex = findProjectIndexByID(state.selectedProjectId);
    const form = new FormData(addTaskForm);

    if (state.currentAction === DATASET_BTN.EDIT_TASK) {
      updateTodo(projectIndex, state.selectedTodoId, form);
    } else if (state.currentAction === DATASET_BTN.ADD_TASK) {
      let newTodo = Todo.fromForm(addTaskForm);
      if (checkSameTodoTitle(projectIndex, newTodo.task_id, newTodo)) {
        projectIndex = findProjectIndexByID(newTodo.task_project);
        state.projects[projectIndex].todoList.push(Todo.fromForm(addTaskForm));
      } else {
        alert(`The task could not be created because a task with the same name already exists. 
Please try giving the task a different name`);
        return;
      }
    }
    sortTodos();
    closeDialogs();
    pushInLocalStorage(state);
    renderSidebar();
    renderDashboard();
    clearForm(addTaskForm);
    state.selectedTodoId = null;
    state.currentAction = null;
  });
};
