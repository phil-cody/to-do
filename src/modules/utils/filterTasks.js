import { TODO_STATUS, TODO_PRIORITY } from '@/modules/utils/constants.js';
import { isToday, isTomorrow, isThisWeek, isBefore, startOfDay } from "date-fns";

export const filterOverdue = (date, status) => {
  if (status === TODO_STATUS.COMPLETED) return;
  return (isBefore(startOfDay(date), startOfDay(new Date())));
}

export const filterToday = (date) => {
  return isToday(date);
}

export const filterTomorrow = (date) => {
  return isTomorrow(date);
}

export const filterThisWeek = (date) => {
  return isThisWeek(date, { weekStartsOn: 1 });
}

export const filterCompleted = (status) => {
  return status === TODO_STATUS.COMPLETED;
}

export const filterPending = (status) => {
  return status === TODO_STATUS.PENDING;
}

export const filterInProcess = (status) => {
  return status === TODO_STATUS.IN_PROCESS;
}

export const filterPriorityHigh = (priority) => {
  return priority === TODO_PRIORITY.HIGH;
}

export const filterPriorityMedium = (priority) => {
  return priority === TODO_PRIORITY.MEDIUM;
}

export const filterPriorityLow = (priority) => {
  return priority === TODO_PRIORITY.LOW;
}