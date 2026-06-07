import { TODO_STATUS, TODO_PRIORITY, DATASET_BTN } from "@/modules/utils/constants.js";
import { format, isToday, isTomorrow } from "date-fns";
import { handlerChange } from "@/modules/handlers/change";

export const renderTodoFull = (todo) => {
  const todoContainer = document.createElement('div');
  todoContainer.classList.add('dialog-container');

  const todoItemDiv = document.createElement("div");
  todoItemDiv.classList.add("todo-item");
  todoItemDiv.id = todo.task_id;
  todoContainer.appendChild(todoItemDiv);

  const todoHeaderDiv = document.createElement('div');
  todoHeaderDiv.classList.add('header');

  const todoTitle = document.createElement("h3");
  todoTitle.textContent = todo.task_title;
  todoHeaderDiv.appendChild(todoTitle);

  const todoCloseBtn = document.createElement('button');
  todoCloseBtn.classList.add('close-dialog');
  todoCloseBtn.dataset.btn = DATASET_BTN.CLOSE_DIALOG;
  todoHeaderDiv.appendChild(todoCloseBtn);

  const closeBtnLineOne = document.createElement('span');
  todoCloseBtn.appendChild(closeBtnLineOne);
  closeBtnLineOne.classList.add('close__line');
  closeBtnLineOne.dataset.btn = DATASET_BTN.CLOSE_DIALOG;
  const closeBtnLineTwo = document.createElement('span');
  todoCloseBtn.appendChild(closeBtnLineTwo);
  closeBtnLineTwo.classList.add('close__line');
  closeBtnLineTwo.dataset.btn = DATASET_BTN.CLOSE_DIALOG;

  const todoDescription = document.createElement("p");
  todoDescription.textContent = todo.task_description;

  const todoDueDateDiv = document.createElement("div");
  todoDueDateDiv.classList.add("due-date");

  const todoDueDateTitle = document.createElement("p");
  todoDueDateTitle.textContent = "Due Date";
  todoDueDateDiv.appendChild(todoDueDateTitle);

  const todoDueDateContent = document.createElement("p");
  todoDueDateContent.textContent = isToday(todo.task_due_date)
    ? "Today"
    : isTomorrow(todo.task_due_date)
      ? "Tomorrow"
      : format(todo.task_due_date, "dd MMM yyyy");
  todoDueDateDiv.appendChild(todoDueDateContent);

  const todoStatusDiv = document.createElement("div");
  todoStatusDiv.classList.add("status");

  const todoStatusLabel = document.createElement("label");
  todoStatusLabel.setAttribute("for", `status_${todo.task_id}`);
  todoStatusLabel.textContent = "Status";
  todoStatusDiv.appendChild(todoStatusLabel);

  const todoStatusSelect = document.createElement("select");
  todoStatusSelect.setAttribute("name", "status");
  todoStatusSelect.id = `status_${todo.task_id}`;
  handlerChange(todoStatusSelect, todo);
  todoStatusDiv.appendChild(todoStatusSelect);

  const todoStatusOptionCompleted = document.createElement("option");
  todoStatusOptionCompleted.setAttribute("value", TODO_STATUS.COMPLETED);
  todoStatusOptionCompleted.textContent = "Completed";

  const todoStatusOptionPending = document.createElement("option");
  todoStatusOptionPending.setAttribute("value", TODO_STATUS.PENDING);
  todoStatusOptionPending.textContent = "Pending";

  const todoStatusOptionInProcess = document.createElement("option");
  todoStatusOptionInProcess.setAttribute("value", TODO_STATUS.IN_PROCESS);
  todoStatusOptionInProcess.textContent = "In Process";

  todoStatusSelect.appendChild(todoStatusOptionCompleted);
  todoStatusSelect.appendChild(todoStatusOptionPending);
  todoStatusSelect.appendChild(todoStatusOptionInProcess);

  switch (todo.task_status) {
    case TODO_STATUS.COMPLETED:
      todoStatusOptionCompleted.setAttribute("selected", "");
      break;
    case TODO_STATUS.PENDING:
      todoStatusOptionPending.setAttribute("selected", "");
      break;
    case TODO_STATUS.IN_PROCESS:
      todoStatusOptionInProcess.setAttribute("selected", "");
      break;
  }

  const todoPriorityDiv = document.createElement("div");
  todoPriorityDiv.classList.add("priority");

  const todoPriorityLabel = document.createElement("label");
  todoPriorityLabel.setAttribute("for", `priority_${todo.task_id}`);
  todoPriorityLabel.textContent = "Priority";
  todoPriorityDiv.appendChild(todoPriorityLabel);

  const todoPrioritySelect = document.createElement("select");
  todoPrioritySelect.setAttribute("name", "priority");
  todoPrioritySelect.id = `priority_${todo.task_id}`;
  handlerChange(todoPrioritySelect, todo);
  todoPriorityDiv.appendChild(todoPrioritySelect);

  const todoPriorityOptionHigh = document.createElement("option");
  todoPriorityOptionHigh.setAttribute("value", TODO_PRIORITY.HIGH);
  todoPriorityOptionHigh.textContent = "High";

  const todoPriorityOptionMedium = document.createElement("option");
  todoPriorityOptionMedium.setAttribute("value", TODO_PRIORITY.MEDIUM);
  todoPriorityOptionMedium.textContent = "Medium";

  const todoPriorityOptionLow = document.createElement("option");
  todoPriorityOptionLow.setAttribute("value", TODO_PRIORITY.LOW);
  todoPriorityOptionLow.textContent = "Low";

  todoPrioritySelect.appendChild(todoPriorityOptionHigh);
  todoPrioritySelect.appendChild(todoPriorityOptionMedium);
  todoPrioritySelect.appendChild(todoPriorityOptionLow);

  switch (todo.task_priority) {
    case TODO_PRIORITY.HIGH:
      todoPriorityOptionHigh.setAttribute("selected", "");
      break;
    case TODO_PRIORITY.MEDIUM:
      todoPriorityOptionMedium.setAttribute("selected", "");
      break;
    case TODO_PRIORITY.LOW:
      todoPriorityOptionLow.setAttribute("selected", "");
      break;
  }

  const todoCreatedAtDiv = document.createElement("div");
  todoCreatedAtDiv.classList.add("due-date");

  const todoCreatedAtTitle = document.createElement("p");
  todoCreatedAtTitle.textContent = "Created At";
  todoCreatedAtDiv.appendChild(todoCreatedAtTitle);

  const todoCreatedAtContent = document.createElement("p");
  todoCreatedAtContent.textContent = format(todo.task_createdAt, "dd MMM yyyy");
  todoCreatedAtDiv.appendChild(todoCreatedAtContent);

  const todoIdDiv = document.createElement('div');
  todoIdDiv.classList.add('id');

  const todoIdTitle = document.createElement('p');
  todoIdTitle.textContent = 'ID';
  todoIdDiv.appendChild(todoIdTitle);

  const todoActionsDiv = document.createElement("div");
  todoActionsDiv.classList.add("actions");

  const todoActionsEditBtn = document.createElement("button");
  todoActionsEditBtn.textContent = "Edit";
  todoActionsEditBtn.classList.add("edit-btn");
  todoActionsEditBtn.dataset.btn = DATASET_BTN.EDIT_TASK;
  todoActionsDiv.appendChild(todoActionsEditBtn);

  const todoActionsDeleteBtn = document.createElement("button");
  todoActionsDeleteBtn.textContent = "Delete";
  todoActionsDeleteBtn.classList.add("delete-btn");
  todoActionsDeleteBtn.dataset.btn = DATASET_BTN.DELETE_TASK;
  todoActionsDiv.appendChild(todoActionsDeleteBtn);

  todoItemDiv.appendChild(todoHeaderDiv);
  todoItemDiv.appendChild(todoDescription);
  todoItemDiv.appendChild(todoDueDateDiv);
  todoItemDiv.appendChild(todoStatusDiv);
  todoItemDiv.appendChild(todoPriorityDiv);
  todoItemDiv.appendChild(todoCreatedAtDiv);
  todoItemDiv.appendChild(todoActionsDiv);

  return todoContainer;
};