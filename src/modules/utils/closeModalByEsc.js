import { state } from "@/modules/state/projects"; 
import { closeDialogs } from "@/modules/utils/closeDialogs";
import { clearForm } from "@/modules/utils/clearForm";

export const closeModalByEsc = (target) => {
  closeDialogs();
  if (target.closest(".dialog-container").querySelector("form"))
    clearForm(target.closest(".dialog-container").querySelector("form"));
  state.selectedTodoId = null;
  state.currentAction = null;
};
