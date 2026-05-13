import { state } from "@/modules/state/projects";
import { closeDialogs } from '@/modules/utils/closeDialogs';
import { Project } from "@/modules/data/Project";
import { Todo } from "@/modules/data/Todo";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import {
  findProjectIndexByID,
  findTaskIndexByID,
} from "@/modules/utils/findProjectIndexById";
import { createProject } from "@/modules/services/projectService";
import { createTodo } from "@/modules/services/todoService";

export const handlerSubmit = () => {

  const projectIndex = findProjectIndexByID(state.selectedProjectId);

  document.addEventListener('submit', e => {
    e.preventDefault();
    const target = e.target;
    let form = new FormData(target);

    if (target.closest('#new-project')) {
      createProject(form);
      state.selectedProjectId = state.projects.at(-1).id;
      closeDialogs();
      renderSidebar();
      renderDashboard();
      return;
    }

    if (target.closest('#new-task')) {
      createTodo(form);
      closeDialogs();
      renderSidebar();
      renderDashboard();
    }
  });
};