export const clearSection = (section) => {
  while (section.firstChild) {
    section.removeChild(section.firstChild);
  }
};