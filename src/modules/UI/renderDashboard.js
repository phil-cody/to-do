import { renderTodoShort } from "@/modules/UI/renderTodoShort";
import { state } from "@/modules/state/projects";
import { DASHBOARD_VIEW, DASHBOARD_FILTER } from "@/modules/utils/constants.js";
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

  const dashboardFilter = document.createElement("div");
  dashboardFilter.classList.add("dashboard__filter");

  const dashboardFilterLabel = document.createElement("label");
  dashboardFilterLabel.setAttribute("for", "select-filter");
  dashboardFilterLabel.textContent = "Select Filter";

  const dashboardFilterSelect = document.createElement("select");
  dashboardFilterSelect.setAttribute("name", "select-filter");
  handlerChange(dashboardFilterSelect);
  dashboardFilterSelect.id = "select-filter";

  const dashboardFilterOptionAll = document.createElement("option");
  dashboardFilterOptionAll.setAttribute("value", DASHBOARD_FILTER.ALL);
  dashboardFilterOptionAll.textContent = "All";

  const dashboardFilterOptionStatusCompleted = document.createElement("option");
  dashboardFilterOptionStatusCompleted.setAttribute(
    "value",
    DASHBOARD_FILTER.STATUS_COMPLETED,
  );
  dashboardFilterOptionStatusCompleted.textContent = "Completed";

  const dashboardFilterOptionStatusPending = document.createElement("option");
  dashboardFilterOptionStatusPending.setAttribute(
    "value",
    DASHBOARD_FILTER.STATUS_PENDING,
  );
  dashboardFilterOptionStatusPending.textContent = "Pending";

  const dashboardFilterOptionStatusInProcess = document.createElement("option");
  dashboardFilterOptionStatusInProcess.setAttribute(
    "value",
    DASHBOARD_FILTER.STATUS_IN_PROCESS,
  );
  dashboardFilterOptionStatusInProcess.textContent = "In Process";

  const dashboardFilterOptionPriorityHigh = document.createElement("option");
  dashboardFilterOptionPriorityHigh.setAttribute(
    "value",
    DASHBOARD_FILTER.PRIORITY_HIGH,
  );
  dashboardFilterOptionPriorityHigh.textContent = "High priority";

  const dashboardFilterOptionPriorityMedium = document.createElement("option");
  dashboardFilterOptionPriorityMedium.setAttribute(
    "value",
    DASHBOARD_FILTER.PRIORITY_MEDIUM,
  );
  dashboardFilterOptionPriorityMedium.textContent = "Medium priority";

  const dashboardFilterOptionPriorityLow = document.createElement("option");
  dashboardFilterOptionPriorityLow.setAttribute(
    "value",
    DASHBOARD_FILTER.PRIORITY_LOW,
  );
  dashboardFilterOptionPriorityLow.textContent = "Low priority";

  const dashboardFilterOptionDateToday = document.createElement("option");
  dashboardFilterOptionDateToday.setAttribute(
    "value",
    DASHBOARD_FILTER.DATE_TODAY,
  );
  dashboardFilterOptionDateToday.textContent = "Today";

  const dashboardFilterOptionDateTomorrow = document.createElement("option");
  dashboardFilterOptionDateTomorrow.setAttribute(
    "value",
    DASHBOARD_FILTER.DATE_TOMORROW,
  );
  dashboardFilterOptionDateTomorrow.textContent = "Tomorrow";

  const dashboardFilterOptionDateThisWeek = document.createElement("option");
  dashboardFilterOptionDateThisWeek.setAttribute(
    "value",
    DASHBOARD_FILTER.DATE_THIS_WEEK,
  );
  dashboardFilterOptionDateThisWeek.textContent = "This Week";

  switch (state.projects[currentProjectIndex].project_filter) {
    case DASHBOARD_FILTER.ALL:
      dashboardFilterOptionAll.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.STATUS_COMPLETED:
      dashboardFilterOptionStatusCompleted.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.STATUS_IN_PROCESS:
      dashboardFilterOptionStatusInProcess.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.STATUS_PENDING:
      dashboardFilterOptionStatusPending.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.PRIORITY_HIGH:
      dashboardFilterOptionPriorityHigh.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.PRIORITY_MEDIUM:
      dashboardFilterOptionPriorityMedium.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.PRIORITY_LOW:
      dashboardFilterOptionPriorityLow.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.DATE_TODAY:
      dashboardFilterOptionDateToday.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.DATE_TOMORROW:
      dashboardFilterOptionDateTomorrow.setAttribute("selected", "");
      break;
    case DASHBOARD_FILTER.DATE_THIS_WEEK:
      dashboardFilterOptionDateThisWeek.setAttribute("selected", "");
      break;
  }

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

  switch (state.projects[currentProjectIndex].project_view) {
    case DASHBOARD_VIEW.GRID:
      dashboardViewOptionGrid.setAttribute("selected", "");
      break;
    case DASHBOARD_VIEW.LIST:
      dashboardViewOptionList.setAttribute("selected", "");
      break;
  }

  const dashboardTodo = document.createElement("div");
  dashboardTodo.classList.add(
    "todo",
    `${state.projects[currentProjectIndex].project_view}`,
  );

  if (state.projects[currentProjectIndex]) {
    let list;
    switch (state.projects[currentProjectIndex].project_filter) {
      case DASHBOARD_FILTER.ALL:
        list = state.projects[currentProjectIndex].showAllTasks();
        break;
      case DASHBOARD_FILTER.STATUS_COMPLETED:
        list = state.projects[currentProjectIndex].showCompletedTasks();
        break;
      case DASHBOARD_FILTER.STATUS_IN_PROCESS:
        list = state.projects[currentProjectIndex].showInProcessTasks();
        break;
      case DASHBOARD_FILTER.STATUS_PENDING:
        list = state.projects[currentProjectIndex].showPendingTasks();
        break;
      case DASHBOARD_FILTER.PRIORITY_HIGH:
        list = state.projects[currentProjectIndex].showPriorityHighTasks();
        break;
      case DASHBOARD_FILTER.PRIORITY_MEDIUM:
        list = state.projects[currentProjectIndex].showPriorityMediumTasks();
        break;
      case DASHBOARD_FILTER.PRIORITY_LOW:
        list = state.projects[currentProjectIndex].showPriorityLowTasks();
        break;
      case DASHBOARD_FILTER.DATE_TODAY:
        list = state.projects[currentProjectIndex].showTodayTasks();
        break;
      case DASHBOARD_FILTER.DATE_TOMORROW:
        list = state.projects[currentProjectIndex].showTomorrowTasks();
        break;
      case DASHBOARD_FILTER.DATE_THIS_WEEK:
        list = state.projects[currentProjectIndex].showThisWeekTasks();
        break;
    }
    for (let todo of list) {
      dashboardTodo.appendChild(renderTodoShort(todo));
    }
  }

  dashboard.appendChild(dashboardContainer);
  dashboardContainer.appendChild(dashboardHeader);
  dashboardContainer.appendChild(dashboardTodo);
  dashboardHeader.appendChild(dashboardHeaderTitle);
  dashboardHeader.appendChild(dashboardHeaderDescription);
  dashboardHeader.appendChild(dashboardFilter);
  dashboardHeader.appendChild(dashboardView);
  dashboardFilter.appendChild(dashboardFilterLabel);
  dashboardFilter.appendChild(dashboardFilterSelect);
  dashboardFilterSelect.appendChild(dashboardFilterOptionAll);
  dashboardFilterSelect.appendChild(dashboardFilterOptionStatusCompleted);
  dashboardFilterSelect.appendChild(dashboardFilterOptionStatusPending);
  dashboardFilterSelect.appendChild(dashboardFilterOptionStatusInProcess);
  dashboardFilterSelect.appendChild(dashboardFilterOptionPriorityHigh);
  dashboardFilterSelect.appendChild(dashboardFilterOptionPriorityMedium);
  dashboardFilterSelect.appendChild(dashboardFilterOptionPriorityLow);
  dashboardFilterSelect.appendChild(dashboardFilterOptionDateToday);
  dashboardFilterSelect.appendChild(dashboardFilterOptionDateTomorrow);
  dashboardFilterSelect.appendChild(dashboardFilterOptionDateThisWeek);
  dashboardView.appendChild(dashboardViewLabel);
  dashboardView.appendChild(dashboardViewSelect);
  dashboardViewSelect.appendChild(dashboardViewOptionGrid);
  dashboardViewSelect.appendChild(dashboardViewOptionList);
  return dashboardContainer;
};
