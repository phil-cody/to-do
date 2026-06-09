export function dynamicDateInForm() {
  const dateField = document.getElementById('task_due_date');
  dateField.valueAsDate = new Date();
}