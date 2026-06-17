export function pushInLocalStorage(obj) {
  localStorage.setItem('todo_app', JSON.stringify(obj, null, 2));
}
