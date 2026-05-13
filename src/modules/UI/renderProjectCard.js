import { TODO_STATUS, TODO_PRIORITY, DATASET_BTN } from '@/modules/utils/constants.js';

export const renderProjectCard = (project) => {
  const projectItemDiv = document.createElement('div');
  projectItemDiv.classList.add('project-item');
  projectItemDiv.id = project.id;

  const projectTitle = document.createElement('h3');
  projectTitle.textContent = project.title;
  const projectInfoDiv = document.createElement('div');
  projectInfoDiv.classList.add('project-item__info');

  const projectAllTasksPara = document.createElement('p');
  projectAllTasksPara.textContent = 'All tasks:';
  const projectAllTasksSpan = document.createElement('span');
  projectAllTasksSpan.textContent = project.allTasks;

  const projectOverduePara = document.createElement('p');
  projectOverduePara.textContent = 'Overdue tasks:';
  const projectOverdueSpan = document.createElement('span');
  projectOverdueSpan.textContent = project.overdueTasks;

  const projectTodayPara = document.createElement('p');
  projectTodayPara.textContent = 'Today tasks:';
  const projectTodaySpan = document.createElement('span');
  projectTodaySpan.textContent = project.todayTasks;

  const projectCompletedPara = document.createElement('p');
  projectCompletedPara.textContent = 'Completed Tasks:';
  const projectCompletedSpan = document.createElement('span');
  projectCompletedSpan.textContent = project.completedTasks;

  const projectActionDiv = document.createElement('div');
  projectActionDiv.classList.add('project-card__actions')

  const projectEditBtn = document.createElement('button');
  projectEditBtn.dataset.btn = DATASET_BTN.EDIT_PROJECT;
  projectEditBtn.textContent = 'Edit';

  const projectDeleteBtn = document.createElement('button');
  projectDeleteBtn.dataset.btn = DATASET_BTN.DELETE_PROJECT;
  projectDeleteBtn.textContent = 'Delete';
  
  projectAllTasksPara.appendChild(projectAllTasksSpan);
  projectInfoDiv.appendChild(projectAllTasksPara);
  projectOverduePara.appendChild(projectOverdueSpan);
  projectInfoDiv.appendChild(projectOverduePara);
  projectTodayPara.appendChild(projectTodaySpan);
  projectInfoDiv.appendChild(projectTodayPara);
  projectCompletedPara.appendChild(projectCompletedSpan);
  projectInfoDiv.appendChild(projectCompletedPara);
  projectItemDiv.appendChild(projectTitle);
  projectItemDiv.appendChild(projectInfoDiv);
  projectActionDiv.appendChild(projectEditBtn);
  projectActionDiv.appendChild(projectDeleteBtn);
  projectItemDiv.appendChild(projectActionDiv);

  return projectItemDiv;
};