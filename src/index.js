import "@/style/main.scss";
import { state } from "@/modules/state/projects";
import { Project } from "@/modules/data/Project";
import { Todo } from "@/modules/data/Todo";
import { findProjectIndexByID } from "@/modules/utils/findIndexById";
import { renderSidebar } from "@/modules/UI/renderSidebar";
import { renderDashboard } from "@/modules/UI/renderDashboard";
import { handlerClick } from "@/modules/handlers/click";
import { handlerSubmit } from "@/modules/handlers/submit";
import { renderTodayDate } from "@/modules/UI/renderTodayDate";
import {
  format,
  parseISO,
  compareAsc,
  isToday,
  isTomorrow,
  isBefore,
  startOfDay,
  differenceInDays,
  addDays,
  formatDistanceToNow,
  isThisWeek,
  isSameDay,
} from "date-fns";
import { pushInLocalStorage } from "@/modules/storage/pushInLocalStorage";
import { pullOutLocalStorage } from "@/modules/storage/pullOutLocalStorage";
import { defaultFormTodo } from "@/modules/utils/defaultTodo";

if (localStorage.length === 0) {
  const defaultProject = Project.defaultProject();
  defaultProject.todoList.push(new Todo(defaultFormTodo));
  state.projects.push(defaultProject);
} else {
  pullOutLocalStorage();
}

state.selectedProjectId = state.projects[0].project_id;

console.log(state);

renderTodayDate();
renderSidebar();
renderDashboard();
handlerClick();
handlerSubmit();

pushInLocalStorage(state.projects);