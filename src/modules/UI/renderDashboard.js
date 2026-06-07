import { renderTodoShort } from "@/modules/UI/renderTodoShort";
import { state } from "@/modules/state/projects";
import { DASHBOARD_VIEW } from "@/modules/utils/constants.js";
import { findProjectIndexByID } from "@/modules/utils/findIndexById";
import { clearSection } from "@/modules/UI/clearSection";
import { handlerChange } from "@/modules/handlers/change";

export const renderDashboard = () => {
  const currentProjectIndex = findProjectIndexByID(state.selectedProjectId);

  const dashboard = document.querySelector(".dashboard");
  clearSection(dashboard);
  const todoBox = document.querySelector(".todo");

  const dashboardContainer = document.createElement("div");
  dashboardContainer.classList.add("container");

  const dashboardHeader = document.createElement("div");
  dashboardHeader.classList.add("dashboard__header");

  const dashboardHeaderTitle = document.createElement("h2");
  dashboardHeaderTitle.textContent = state.projects[currentProjectIndex]
    ? state.projects[currentProjectIndex].project_title
    : "Place for your project";

  const dashboardHeaderDescription = document.createElement("p");
  dashboardHeaderDescription.textContent = state.projects[currentProjectIndex]
    ? state.projects[currentProjectIndex].project_description
    : "You can add any tasks to the project";

  const dashboardView = document.createElement("div");
  dashboardView.classList.add("dashboard__view");

  const dashboardViewLabel = document.createElement("label");
  dashboardViewLabel.setAttribute("for", "select-view");
  dashboardViewLabel.textContent = "Select View";

  const dashboardViewSelect = document.createElement("select");
  dashboardViewSelect.setAttribute("name", "select-view");
  handlerChange(dashboardViewSelect);
  dashboardViewSelect.id = "select-view";

  const dashboardViewOptionGrid = document.createElement("option");
  dashboardViewOptionGrid.setAttribute("value", DASHBOARD_VIEW.GRID);
  dashboardViewOptionGrid.textContent = "Grid";

  const dashboardViewOptionList = document.createElement("option");
  dashboardViewOptionList.setAttribute("value", DASHBOARD_VIEW.LIST);
  dashboardViewOptionList.textContent = "List";

  const dashboardTodo = document.createElement("div");
  dashboardTodo.classList.add("todo", "grid");

  if (state.projects[currentProjectIndex]) {
    for (const todo of state.projects[currentProjectIndex].todoList) {
      dashboardTodo.appendChild(renderTodoShort(todo));
    }
  }

  dashboard.appendChild(dashboardContainer);
  dashboardContainer.appendChild(dashboardHeader);
  dashboardContainer.appendChild(dashboardTodo);
  dashboardHeader.appendChild(dashboardHeaderTitle);
  dashboardHeader.appendChild(dashboardHeaderDescription);
  dashboardHeader.appendChild(dashboardView);
  dashboardView.appendChild(dashboardViewLabel);
  dashboardView.appendChild(dashboardViewSelect);
  dashboardViewSelect.appendChild(dashboardViewOptionGrid);
  dashboardViewSelect.appendChild(dashboardViewOptionList);

  return dashboardContainer;
};
