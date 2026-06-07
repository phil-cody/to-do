import { state } from "@/modules/state/projects";

export const toggleSelectedProject = (projectId) => {
  const box = document.querySelector('.projects');
  for (let project of Array.from(box.children)) {
    if (project.id === projectId) {
      project.classList.add("selected");
    } else {
      project.classList.remove("selected");
    }
  }
};
