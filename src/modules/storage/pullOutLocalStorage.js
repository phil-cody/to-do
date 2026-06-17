import { state } from "@/modules/state/projects";
import { Project } from "@/modules/data/Project";

export function pullOutLocalStorage() {
  const raw = localStorage.getItem("todo_app");

  if (!raw) return;

  const projects = JSON.parse(raw);
  for (let project of projects) {
    state.projects.push(Project.fromStorage(project));
    console.log(project)
  }
}
