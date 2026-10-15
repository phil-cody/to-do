import test from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../src/app/model.js";
import { RemoteRepository } from "../src/app/sync/remote-repository.js";
class MemoryStore {
  constructor() {
    this.values = new Map();
  }
  async read(key) {
    return structuredClone(this.values.get(key));
  }
  async change(key, update) {
    const result = update(await this.read(key));
    if (result === undefined) this.values.delete(key);
    else this.values.set(key, structuredClone(result));
    return result;
  }
}
function setup() {
  const store = new MemoryStore(),
    operations = new Set();
  let snapshot = normalize({ projects: [] }),
    revision = 1,
    offline = false,
    lostReply = false,
    unauthorized = false,
    account = "11",
    switchOnWrite = false;
  const repo = new RemoteRepository("/api/workspace", {
    store,
    request: async (url, options) => {
      if (offline) throw new TypeError("network unavailable");
      if (unauthorized)
        return Response.json({ error: "Вход нужен" }, { status: 401 });
      if (switchOnWrite && options.method === "PUT") account = "22";
      if (switchOnWrite && options.headers["X-Account-ID"] !== account)
        return Response.json({ error: "Аккаунт изменился" }, { status: 401 });
      if (url.includes("/operations/"))
        return Response.json({
          applied: operations.has(url.split("/").at(-1)),
        });
      if (options.method === "PUT") {
        const id = options.headers["X-Operation-ID"];
        if (!operations.has(id)) {
          if (
            Number(options.headers["If-Match"].replaceAll('"', "")) !== revision
          )
            return Response.json({ error: "conflict" }, { status: 409 });
          snapshot = JSON.parse(options.body);
          revision++;
          operations.add(id);
        }
        if (lostReply) {
          lostReply = false;
          throw new TypeError("reply lost");
        }
        return Response.json({ snapshot, revision });
      }
      return Response.json({
        snapshot,
        revision,
        user: { id: account, name: "Test" },
      });
    },
  });
  return {
    repo,
    store,
    get snapshot() {
      return snapshot;
    },
    offline(value) {
      offline = value;
    },
    loseReply() {
      lostReply = true;
    },
    revoke() {
      unauthorized = true;
    },
    switchAccount(onWrite = false) {
      if (onWrite) switchOnWrite = true;
      else account = "22";
    },
  };
}
test("Remote repository sends a durable edit and reports successful online synchronization", async () => {
  const f = setup(),
    base = await f.repo.load(),
    next = structuredClone(base);
  next.projects[0].project_title = "Edited";
  await f.repo.save(next, base);
  assert.equal(f.snapshot.projects[0].project_title, "Edited");
  assert.equal(f.repo.status.online, true);
  assert.equal(f.repo.status.pending, 0);
  assert.equal((await f.store.read("user:11")).queue.length, 0);
});

for (const onWrite of [false, true]) {
  test(`Account switch ${onWrite ? "between read and write" : "before refresh"} preserves the old draft without sending it to the new account`, async () => {
    const f = setup(),
      base = await f.repo.load(),
      next = structuredClone(base);
    next.projects[0].project_title = "Private offline draft";
    f.offline(true);
    await f.repo.save(next, base);
    f.offline(false);
    f.switchAccount(onWrite);
    await assert.rejects(f.repo.flush(), (error) => error.authentication);
    assert.equal(f.repo.user, null);
    assert.equal(await f.store.read("active"), undefined);
    assert.equal((await f.store.read("user:11")).queue.length, 1);
    assert.equal(await f.store.read("user:22"), undefined);
    assert.notEqual(
      f.snapshot.projects[0].project_title,
      "Private offline draft",
    );
  });
}
test("Lost save response is retried idempotently and does not overwrite a later server change", async () => {
  const f = setup(),
    base = await f.repo.load(),
    next = structuredClone(base);
  next.projects[0].project_title = "Mine";
  f.loseReply();
  await f.repo.save(next, base);
  assert.equal(f.repo.status.pending, 1);
  f.snapshot.projects[0].project_title = "Changed after my saved operation";
  await f.repo.flush();
  assert.equal(f.repo.status.pending, 0);
  assert.equal(
    f.snapshot.projects[0].project_title,
    "Changed after my saved operation",
  );
});
test("Expired session does not delete unsent edits, and cannot expose them as another account", async () => {
  const f = setup(),
    base = await f.repo.load(),
    next = structuredClone(base);
  next.projects[0].project_title = "Offline draft";
  f.offline(true);
  await f.repo.save(next, base);
  f.offline(false);
  f.revoke();
  await assert.rejects(f.repo.flush(), (error) => error.authentication);
  assert.equal(f.repo.user, null);
  assert.equal(await f.store.read("active"), undefined);
  assert.equal((await f.store.read("user:11")).queue.length, 1);
});

test("Saving during an already running refresh still drains the newly queued edit", async () => {
  const f = setup(),
    base = await f.repo.load(),
    next = structuredClone(base);
  next.projects[0].project_title = "Saved during refresh";
  const refresh = f.repo.flush();
  await f.repo.save(next, base);
  await refresh;
  assert.equal(f.snapshot.projects[0].project_title, "Saved during refresh");
  assert.equal(f.repo.status.pending, 0);
});
