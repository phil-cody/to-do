import {
  findProjectIndexByID,
  findTaskIndexByID,
} from "@/modules/utils/findIndexById";
import { state } from "@/modules/state/projects";
import { getProjectById } from "@/modules/services/projectService";

export function checkTheAvailabilityOfTheProjectAtTheTask() {
  state.projects.forEach((project) => {
    project.todoList.forEach((todo) => {
      if (todo.task_project === project.project_id) {        
        return;
      } else if (!todo.task_project || todo.task_project !== project.project_id) {
        const currentProject = getProjectById(project.project_id);
        const todoIndex = findTaskIndexByID(todo.task_id);
        
        currentProject.todoList[todoIndex].updateTodoProject(project.project_id);
      }
    });
  });
}