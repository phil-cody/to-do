export const clearForm = (form) => {
  Array.from(form.elements).forEach((item) => {
    if (item.type === 'text' || item.type === 'date') item.value = "";
    if (item.type === "text") item.textContent = "";
    if (item.type === 'select-one') item.selectedIndex = 0;
  });
};
