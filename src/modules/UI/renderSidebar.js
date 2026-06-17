import { renderTodoShort } from "@/modules/UI/renderTodoShort";
import { renderProjectCard } from "@/modules/UI/renderProjectCard";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import { state } from "@/modules/state/projects";
import { findProjectIndexByID } from "@/modules/utils/findIndexById";
import { clearSection } from "@/modules/UI/clearSection";

export const renderSidebar = () => {
  const sidebarProjectBox = document.querySelector(".sidebar .projects");
  clearSection(sidebarProjectBox);

  if (state.projects.length === 0) {
    return;
  }

  const sortProjects = [...state.projects].sort((a, b) => a.project_priority - b.project_priority);

  for (let project of sortProjects) {
    const projectCard = renderProjectCard(project);
    sidebarProjectBox.appendChild(projectCard);
    if (project.project_id === state.selectedProjectId) {
      projectCard.classList.add("selected");
    }
  }
};
