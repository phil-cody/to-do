import "@/style/main.scss";
import { state } from "@/modules/state/projects";
import { Project } from "@/modules/data/Project";
import { findProjectIndexByID } from '@/modules/utils/findProjectIndexById';
import { renderSidebar } from '@/modules/UI/renderSidebar';
import { renderDashboard } from '@/modules/UI/renderDashboard';
import { handlerClick } from '@/modules/handlers/click';
import { handlerSubmit } from '@/modules/handlers/submit';
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

const defaultFormProject = new FormData();
defaultFormProject.set("project-title", "To-Do List");
defaultFormProject.set("project-description", "Current To-Do List");

const defaultProject = new Project(defaultFormProject);

state.projects.push(defaultProject);
state.selectedProjectId = state.projects[0].id;

handlerClick();
handlerSubmit();
renderSidebar();
renderDashboard();