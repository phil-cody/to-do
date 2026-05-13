import { TODO_STATUS, TODO_PRIORITY } from '@/modules/utils/constants.js';
import { isToday, isBefore, startOfDay } from "date-fns";

export const filterOverdue = (date, status) => {
  return (isBefore(startOfDay(date), startOfDay(new Date())) && status !== TODO_STATUS.COMPLETED);
}

export const filterToday = (date) => {
  return isToday(date);
}

export const filterCompleted = (status) => {
  return status === TODO_STATUS.COMPLETED;
}