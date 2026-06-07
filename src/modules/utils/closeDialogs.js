export const closeDialogs = () => {
  const dialogs = document.querySelectorAll('dialog');

  dialogs.forEach(dialog => {
    dialog.close();
  });
};
