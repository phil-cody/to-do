import { renderTodoShort } from "@/modules/UI/renderTodoShort";
import { state } from "@/modules/state/projects";
import {
  DASHBOARD_VIEW,
  DASHBOARD_FILTER,
  DATASET_BTN,
} from "@/modules/utils/constants.js";
import { findProjectIndexByID } from "@/modules/utils/findIndexById";
import { clearSection } from "@/modules/UI/clearSection";
import { handlerChange } from "@/modules/handlers/change";
import gridIcon from "@/assets/image/grid-icon.svg";
import listIcon from "@/assets/image/list-icon.svg";
import filterIcon from "@/assets/image/filter-icon.svg";

export const renderDashboard = () => {
  const currentProjectIndex = findProjectIndexByID(state.selectedProjectId);
  const currentProject = state.projects[currentProjectIndex];

  const dashboard = document.querySelector(".dashboard");
  clearSection(dashboard);
  const todoBox = document.querySelector(".todo");

  const dashboardContainer = document.createElement("div");
  dashboardContainer.classList.add("container");

  const dashboardHeader = document.createElement("div");
  dashboardHeader.classList.add("dashboard__header");

  const dashboardHeaderContent = document.createElement("div");
  dashboardHeaderContent.classList.add("dashboard__intro");

  const dashboardHeaderTitle = document.createElement("h2");
  dashboardHeaderTitle.textContent = currentProject
    ? currentProject.project_title
    : "Place for your project";

  const dashboardHeaderDescription = document.createElement("p");
  dashboardHeaderDescription.textContent = currentProject
    ? currentProject.project_description
    : "You can add any tasks to the project";

  const dashboardStats = document.createElement("div");
  dashboardStats.classList.add("dashboard__stats");
  if (currentProject) {
    dashboardStats.innerHTML = `
      <span>${currentProject.allTasks} Tasks</span>
      <span class="danger">${currentProject.overdueTasks} Overdue</span>
      <span class="success">${currentProject.todayTasks} Today</span>
      <span>Priority #${currentProject.project_priority}</span>
    `;
  }

  const dashboardControls = document.createElement("div");
  dashboardControls.classList.add("dashboard__controls");

  const dashboardFilter = document.createElement("div");
  dashboardFilter.classList.add("dashboard__filter");

  const dashboardFilterLabel = document.createElement("label");
  dashboardFilterLabel.setAttribute("for", "select-filter");
  dashboardFilterLabel.textContent = "Filter";

  const dashboardFilterIcon = document.createElement("img");
  dashboardFilterIcon.src = filterIcon;
  dashboardFilterIcon.alt = "";
  dashboardFilterIcon.setAttribute("aria-hidden", "true");

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

  const dashboardFilterOptionOverdue = document.createElement("option");
  dashboardFilterOptionOverdue.setAttribute(
    "value",
    DASHBOARD_FILTER.OVERDUE,
  );
  dashboardFilterOptionOverdue.textContent = "Overdue";

  switch (currentProject.project_filter) {
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
    case DASHBOARD_FILTER.OVERDUE:
      dashboardFilterOptionOverdue.setAttribute("selected", "");
      break;
    case null: 
      break;
  }

  const dashboardView = document.createElement("div");
  dashboardView.classList.add("dashboard__view");

  const dashboardViewLabel = document.createElement("label");
  dashboardViewLabel.setAttribute("for", "select-view");
  dashboardViewLabel.textContent = "View";

  const dashboardViewSelect = document.createElement("select");
  dashboardViewSelect.setAttribute("name", "select-view");
  handlerChange(dashboardViewSelect);
  dashboardViewSelect.id = "select-view";

  const dashboardViewSegment = document.createElement("div");
  dashboardViewSegment.classList.add("dashboard__view-segment");

  const dashboardViewGridBtn = document.createElement("button");
  dashboardViewGridBtn.type = "button";
  dashboardViewGridBtn.dataset.view = DASHBOARD_VIEW.GRID;
  dashboardViewGridBtn.innerHTML = `
    <img src="${gridIcon}" alt="" aria-hidden="true">
    <span>Grid</span>
  `;

  const dashboardViewListBtn = document.createElement("button");
  dashboardViewListBtn.type = "button";
  dashboardViewListBtn.dataset.view = DASHBOARD_VIEW.LIST;
  dashboardViewListBtn.innerHTML = `
    <img src="${listIcon}" alt="" aria-hidden="true">
    <span>List</span>
  `;

  dashboardViewSegment.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    dashboardViewSelect.value = button.dataset.view;
    dashboardViewGridBtn.classList.toggle(
      "is-active",
      button.dataset.view === DASHBOARD_VIEW.GRID,
    );
    dashboardViewListBtn.classList.toggle(
      "is-active",
      button.dataset.view === DASHBOARD_VIEW.LIST,
    );
    dashboardViewSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const dashboardViewOptionGrid = document.createElement("option");
  dashboardViewOptionGrid.setAttribute("value", DASHBOARD_VIEW.GRID);
  dashboardViewOptionGrid.textContent = "Grid";

  const dashboardViewOptionList = document.createElement("option");
  dashboardViewOptionList.setAttribute("value", DASHBOARD_VIEW.LIST);
  dashboardViewOptionList.textContent = "List";

  switch (currentProject.project_view) {
    case DASHBOARD_VIEW.GRID:
      dashboardViewOptionGrid.setAttribute("selected", "");
      dashboardViewGridBtn.classList.add("is-active");
      break;
    case DASHBOARD_VIEW.LIST:
      dashboardViewOptionList.setAttribute("selected", "");
      dashboardViewListBtn.classList.add("is-active");
      break;
  }

  const dashboardTodo = document.createElement("div");
  dashboardTodo.classList.add(
    "todo",
    `${currentProject.project_view}`,
  );

  if (currentProject) {
    let list;
    switch (currentProject.project_filter) {
      case DASHBOARD_FILTER.ALL:
        list = currentProject.showAllTasks();
        break;
      case DASHBOARD_FILTER.STATUS_COMPLETED:
        list = currentProject.showCompletedTasks();
        break;
      case DASHBOARD_FILTER.STATUS_IN_PROCESS:
        list = currentProject.showInProcessTasks();
        break;
      case DASHBOARD_FILTER.STATUS_PENDING:
        list = currentProject.showPendingTasks();
        break;
      case DASHBOARD_FILTER.PRIORITY_HIGH:
        list = currentProject.showPriorityHighTasks();
        break;
      case DASHBOARD_FILTER.PRIORITY_MEDIUM:
        list = currentProject.showPriorityMediumTasks();
        break;
      case DASHBOARD_FILTER.PRIORITY_LOW:
        list = currentProject.showPriorityLowTasks();
        break;
      case DASHBOARD_FILTER.DATE_TODAY:
        list = currentProject.showTodayTasks();
        break;
      case DASHBOARD_FILTER.DATE_TOMORROW:
        list = currentProject.showTomorrowTasks();
        break;
      case DASHBOARD_FILTER.DATE_THIS_WEEK:
        list = currentProject.showThisWeekTasks();
        break;
      case DASHBOARD_FILTER.OVERDUE:
        list = currentProject.showOverdueTasks();
        break;
    }
    for (let todo of list) {
      dashboardTodo.appendChild(renderTodoShort(todo));
    }
  }

  const addTaskCard = document.createElement("button");
  addTaskCard.classList.add("todo-add-card");
  addTaskCard.dataset.btn = DATASET_BTN.ADD_TASK;
  addTaskCard.type = "button";
  addTaskCard.innerHTML = `
    <span class="todo-add-card__icon" aria-hidden="true"></span>
    <strong>Create New Task</strong>
  `;
  dashboardTodo.appendChild(addTaskCard);

  dashboard.appendChild(dashboardContainer);
  dashboardContainer.appendChild(dashboardHeader);
  dashboardContainer.appendChild(dashboardControls);
  dashboardContainer.appendChild(dashboardTodo);
  dashboardHeader.appendChild(dashboardHeaderContent);
  dashboardHeader.appendChild(dashboardStats);
  dashboardHeaderContent.appendChild(dashboardHeaderTitle);
  dashboardHeaderContent.appendChild(dashboardHeaderDescription);
  dashboardControls.appendChild(dashboardView);
  dashboardControls.appendChild(dashboardFilter);
  dashboardFilter.appendChild(dashboardFilterLabel);
  dashboardFilter.appendChild(dashboardFilterIcon);
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
  dashboardFilterSelect.appendChild(dashboardFilterOptionOverdue);
  dashboardView.appendChild(dashboardViewLabel);
  dashboardView.appendChild(dashboardViewSelect);
  dashboardView.appendChild(dashboardViewSegment);
  dashboardViewSegment.appendChild(dashboardViewGridBtn);
  dashboardViewSegment.appendChild(dashboardViewListBtn);
  dashboardViewSelect.appendChild(dashboardViewOptionGrid);
  dashboardViewSelect.appendChild(dashboardViewOptionList);
  return dashboardContainer;
};
