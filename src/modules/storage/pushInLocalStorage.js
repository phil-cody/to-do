export function pushInLocalStorage(obj) {

  for (let [index, project] of Object.entries(obj)) {
    localStorage.setItem(project.project_id, JSON.stringify(project, ' ', 2));
  }
}
