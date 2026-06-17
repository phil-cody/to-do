export function pushInLocalStorage(obj) {

  for (let [index, project] of Object.entries(obj)) {
    if (typeof project.project_priority === 'string') project.project_priority = Number(project.project_priority);
    localStorage.setItem(project.project_id, JSON.stringify(project, ' ', 2));
  }
}
