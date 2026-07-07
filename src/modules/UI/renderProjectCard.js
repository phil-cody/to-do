import { DATASET_BTN } from "@/modules/utils/constants.js";

export const renderProjectCard = (project) => {
  const projectItemDiv = document.createElement("div");
  projectItemDiv.classList.add("project-item");
  projectItemDiv.id = project.project_id;

  const projectHeader = document.createElement("div");
  projectHeader.classList.add("project-item_header");

  const projectTitle = document.createElement("h3");
  projectTitle.textContent = project.project_title;
  const projectInfoDiv = document.createElement("div");
  projectInfoDiv.classList.add("project-item__info");

  const projectAllTasksPara = document.createElement("p");
  projectAllTasksPara.textContent = "All tasks:";
  const projectAllTasksSpan = document.createElement("span");
  projectAllTasksSpan.textContent = project.allTasks;

  const projectOverduePara = document.createElement("p");
  projectOverduePara.textContent = "Overdue tasks:";
  const projectOverdueSpan = document.createElement("span");
  projectOverdueSpan.textContent = project.overdueTasks;

  const projectTodayPara = document.createElement("p");
  projectTodayPara.textContent = "Today tasks:";
  const projectTodaySpan = document.createElement("span");
  projectTodaySpan.textContent = project.todayTasks;

  const projectCompletedPara = document.createElement("p");
  projectCompletedPara.textContent = "Completed Tasks:";
  const projectCompletedSpan = document.createElement("span");
  projectCompletedSpan.textContent = project.completedTasks;

  const projectActionDiv = document.createElement("div");
  projectActionDiv.classList.add("project-card__actions");

  const projectEditBtn = document.createElement("button");
  projectEditBtn.dataset.btn = DATASET_BTN.EDIT_PROJECT;
  projectEditBtn.textContent = "Edit";

  const projectDeleteBtn = document.createElement("button");
  projectDeleteBtn.dataset.btn = DATASET_BTN.DELETE_PROJECT;
  projectDeleteBtn.textContent = "Delete";

  projectAllTasksPara.appendChild(projectAllTasksSpan);
  projectInfoDiv.appendChild(projectAllTasksPara);
  projectOverduePara.appendChild(projectOverdueSpan);
  projectInfoDiv.appendChild(projectOverduePara);
  projectTodayPara.appendChild(projectTodaySpan);
  projectInfoDiv.appendChild(projectTodayPara);
  projectCompletedPara.appendChild(projectCompletedSpan);
  projectInfoDiv.appendChild(projectCompletedPara);
  projectItemDiv.appendChild(projectHeader);
  projectHeader.appendChild(projectTitle);
  projectItemDiv.appendChild(projectInfoDiv);
  projectActionDiv.appendChild(projectEditBtn);
  projectActionDiv.appendChild(projectDeleteBtn);
  projectItemDiv.appendChild(projectActionDiv);

  projectHeader.insertAdjacentHTML(
    "beforeend",
    `<button data-btn=${DATASET_BTN.PIN_PROJECT}>
      <svg fill="#000000" 
        width="16px" 
        height="16px" 
        viewBox="0 0 24 24" 
        version="1.2" 
        baseProfile="tiny" 
        xmlns="http://www.w3.org/2000/svg">
        <path 
        d="M16.729 4.271c-.389-.391-1.021-.393-1.414-.004-.104.104-.176.227-.225.355-.832 
          1.736-1.748 2.715-2.904 3.293-1.297.64-2.786 1.085-5.186 1.085-.13 
          0-.26.025-.382.076-.245.102-.439.297-.541.541-.101.244-.101.52 0 
          .764.051.123.124.234.217.326l3.243 3.243-4.537 6.05 6.05-4.537 3.242 
          3.242c.092.094.203.166.326.217.122.051.252.078.382.078s.26-.027.382-.078c.245-.102.44-.295.541-.541.051-.121.077-.252.077-.381 
          0-2.4.444-3.889 1.083-5.166.577-1.156 
          1.556-2.072 3.293-2.904.129-.049.251-.121.354-.225.389-.393.387-1.025-.004-1.414l-3.997-4.02z"/>
      </svg>
    </button>`,
  );

  return projectItemDiv;
};
