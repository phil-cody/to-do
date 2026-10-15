export class ClientStore {
  constructor() {
    this.database = null;
  }
  open() {
    if (!this.database)
      this.database = new Promise((resolve, reject) => {
        const request = indexedDB.open("todo-sync-v1", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("state");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(new Error("Не удалось открыть офлайн-хранилище."));
      });
    return this.database;
  }
  async read(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("state", "readonly"),
        r = tx.objectStore("state").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async change(key, update) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("state", "readwrite"),
        store = tx.objectStore("state"),
        request = store.get(key);
      let value;
      request.onsuccess = () => {
        try {
          value = update(request.result);
          if (value === undefined) store.delete(key);
          else store.put(value, key);
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error("Запись в офлайн-хранилище прервана."));
    });
  }
}
