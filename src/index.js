import "@/style/main.scss";

import logo from "@/assets/image/favicon.svg";
import { setFavicon } from "@/modules/utils/setFavicon";

import { state } from "@/modules/state/projects";
import { Project } from "@/modules/data/Project";
import { Todo } from "@/modules/data/Todo";

import {
  findProjectIndexByID,
  findTaskIndexByID,
} from "@/modules/utils/findIndexById";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import { handlerClick } from "@/modules/handlers/click";
import { handlerSubmit } from "@/modules/handlers/submit";
import { renderTodayDate } from "@/modules/UI/renderTodayDate";
import { pushInLocalStorage } from "@/modules/storage/pushInLocalStorage";
import { pullOutLocalStorage } from "@/modules/storage/pullOutLocalStorage";
import { defaultTodo } from "@/modules/utils/defaultTodo";
import { dynamicDateInForm } from "@/modules/utils/dynamicDateInForm";
import { sortTodos } from "@/modules/utils/sortTodos";
import { closeModalByEsc } from "@/modules/utils/closeModalByEsc";
import { checkTheAvailabilityOfTheProjectAtTheTask } from "@/modules/utils/checkTheAvailabilityOfTheProjectAtTheTask";

setFavicon(logo);

pullOutLocalStorage();

if (state.projects.length === 0) {
  const defaultProject = Project.defaultProject();
  defaultProject.todoList.push(Todo.fromData(defaultTodo));
  state.projects.push(defaultProject);
  state.selectedProjectId = state.projects[0].project_id;
}

state.selectedProjectId = JSON.parse(localStorage.getItem('todo_app')).selectedProjectId

sortTodos();

renderTodayDate();
renderSidebar();
renderDashboard();
handlerClick();
handlerSubmit();
dynamicDateInForm();

checkTheAvailabilityOfTheProjectAtTheTask();

pushInLocalStorage(state);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModalByEsc(event.target);
  }
});