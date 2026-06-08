import { state } from "@/modules/state/projects";
import { Project } from "@/modules/data/Project";

export function pullOutLocalStorage() {
  for (let [id, project] of Object.entries(localStorage)) {
    state.projects.push(Project.fromStorage(JSON.parse(project)));
  }
}