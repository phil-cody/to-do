import { dynamicDateInForm } from "@/modules/utils/dynamicDateInForm";

export const clearForm = (form) => {
  Array.from(form.elements).forEach((item) => {
    if (item.type === "text") item.value = "";
    if (item.type === "text") item.textContent = "";
    if (item.type === "select-one") item.selectedIndex = 2;
  });
  dynamicDateInForm();
};
