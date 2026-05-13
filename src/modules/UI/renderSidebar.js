import { renderTodoShort } from "@/modules/UI/renderTodoShort";
import { renderProjectCard } from "@/modules/UI/renderProjectCard";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import { state } from "@/modules/state/projects";
import { findProjectIndexByID } from "@/modules/utils/findProjectIndexById";
import { clearSection } from "@/modules/UI/clearSection";

export const renderSidebar = () => {
  const sidebarProjectBox = document.querySelector(".sidebar .projects");
  clearSection(sidebarProjectBox);

  if (state.projects.length === 0) {
    return;
  }

  for (let project of state.projects) {
    const projectCard = renderProjectCard(project);
    projectCard.classList.add("selected");
    sidebarProjectBox.appendChild(projectCard);
  }
};
