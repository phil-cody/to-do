import { state } from "@/modules/state/projects";
import { DATASET_BTN } from "@/modules/utils/constants";

export function maxProjectPriority() {
  const priorityField = document.getElementById("project_priority");
  let maxPriority;

  if (state.currentAction === DATASET_BTN.ADD_PROJECT) {
    maxPriority = state.projects.length + 1;
  } else {
    maxPriority = state.projects.length;
  }

  priorityField.setAttribute("max", maxPriority);
}
