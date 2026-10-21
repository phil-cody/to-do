import { RemoteRepository } from "./sync/remote-repository.js";
export { HttpRepository } from "./sync/http-repository.js";
import { AttachmentStorage } from "./attachments.js";
import { normalize } from "./model.js";
export class LocalRepository {
  constructor(storage) {
    this.storage = storage;
    this.attachments = new AttachmentStorage();
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
  async exportDraft() {
    return this.attachments.export(await this.load(), "local");
  }
  async attachment(file) {
    return this.attachments.read("local", file);
  }
  async save(data) {
    data = await this.attachments.prepare(data, "local");
    (this.storage || window.localStorage).setItem(
      "todo_app",
      JSON.stringify(data),
    );
    return data;
  }
}
export function createRepository() {
  const url =
    window.TODO_APP_CONFIG?.apiUrl ||
    document.querySelector('meta[name="todo-api-url"]')?.content;
  return url ? new RemoteRepository(url) : new LocalRepository();
}
