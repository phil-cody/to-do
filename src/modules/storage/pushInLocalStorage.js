export function pushInLocalStorage(obj) {
  console.trace()
  localStorage.setItem('todo_app', JSON.stringify(obj, null, 2));
}