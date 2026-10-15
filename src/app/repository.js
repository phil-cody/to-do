import { RemoteRepository } from "./sync/remote-repository.js";
export { HttpRepository } from "./sync/http-repository.js";
import { normalize } from "./model.js";
export class LocalRepository {
  constructor(storage) {
    this.storage = storage;
  }
  async load() {
    const raw = (this.storage || window.localStorage).getItem("todo_app");
    return normalize(raw ? JSON.parse(raw) : { projects: [] });
  }
  subscribe(listener) {
    const onStorage = (event) => {
      if (event.key === "todo_app")
        this.load()
          .then((data) => listener(data, { local: true }))
          .catch(() => {});
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }
  async save(data) {
    (this.storage || window.localStorage).setItem(
      "todo_app",
      JSON.stringify(data),
    );
  }
}
export function createRepository() {
  const url =
    window.TODO_APP_CONFIG?.apiUrl ||
    document.querySelector('meta[name="todo-api-url"]')?.content;
  return url ? new RemoteRepository(url) : new LocalRepository();
}
