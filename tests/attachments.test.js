import test from "node:test";
import assert from "node:assert/strict";
import {
  AttachmentStorage,
  attachmentMetadata,
  attachmentBytes,
  attachmentId,
  attachmentLimits,
} from "../src/app/attachments.js";
import { normalize } from "../src/app/model.js";
import {
  parseProjectImport,
  appendProjectImport,
} from "../src/app/import-project.js";
import { Store, hash } from "../server/store.js";
import { createApp } from "../server/app.js";
import { RemoteRepository } from "../src/app/sync/remote-repository.js";
class MemoryStore {
  values = new Map();
  async read(key) {
    return structuredClone(this.values.get(key));
  }
  async change(key, update) {
    const value = update(await this.read(key));
    this.values.set(key, structuredClone(value));
    return value;
  }
}
const file = {
  id: hash("example"),
  name: "example.txt",
  size: 7,
  data: Buffer.from("example").toString("base64"),
};
function withFile(snapshot = normalize({ projects: [] })) {
  const next = structuredClone(snapshot),
    project = next.projects[0];
  project.todoList.push({
    task_id: "file-task",
    task_project: project.project_id,
    task_title: "File task",
    task_description: "",
    task_status: "pending",
    task_priority: "low",
    task_due_date: "",
    task_createdAt: "",
    task_attachments: [structuredClone(file)],
  });
  return next;
}
test("attachment limits, durable storage, account isolation and portable backup/import", async () => {
  assert.equal(
    attachmentMetadata([{ ...file, size: attachmentLimits.bytes }])[0].size,
    20 * 1024 * 1024,
  );
  assert.throws(
    () => attachmentMetadata([{ ...file, size: attachmentLimits.bytes + 1 }]),
    /Invalid/,
  );
  assert.throws(() => attachmentMetadata(Array(11).fill(file)), /Maximum/);
  assert.throws(() => attachmentMetadata([file, file]), /Invalid/);
  assert.throws(() => attachmentBytes("<script>"), /Invalid/);
  assert.equal(await attachmentId(attachmentBytes(file.data)), file.id);
  const memory = new MemoryStore(),
    storage = new AttachmentStorage(memory);
  const snapshot = await storage.prepare(withFile(), "user:11");
  assert.equal(
    snapshot.projects[0].todoList[0].task_attachments[0].data,
    undefined,
  );
  const reloaded = new AttachmentStorage(memory);
  assert.equal((await reloaded.read("user:11", file)).data, file.data);
  await assert.rejects(reloaded.read("user:22", file), /unavailable/);
  const backup = await storage.export(snapshot, "user:11");
  const imported = appendProjectImport(
    normalize({ projects: [] }),
    parseProjectImport(JSON.stringify(backup)),
  );
  const restored = await storage.prepare(imported, "user:22");
  assert.equal(
    restored.projects[0].todoList[0].task_attachments[0].id,
    file.id,
  );
  assert.equal((await storage.read("user:22", file)).data, file.data);
  const corrupt = withFile();
  corrupt.projects[0].todoList[0].task_attachments[0].data = "Yg==";
  await assert.rejects(storage.prepare(corrupt, "local"), /Invalid/);
});
test("attachment API is private, account-bound, idempotent, validates content and references; cleanup retains active files", async () => {
  const store = new Store(":memory:");
  store.ensureUser({ id: 11 }, "11");
  store.ensureUser({ id: 22 }, "22");
  const secret = store.session("11"),
    other = store.session("22");
  const app = createApp({
    store,
    origin: "http://127.0.0.1:4019",
    openRegistration: true,
  });
  await new Promise((resolve) => app.server.listen(4019, "127.0.0.1", resolve));
  const request = (options = {}) =>
    fetch(`http://127.0.0.1:4019/api/attachments/${file.id}`, {
      ...options,
      headers: {
        Origin: "http://127.0.0.1:4019",
        "Content-Type": "application/json",
        Cookie: `todo_session=${secret}`,
        "X-Account-ID": "11",
        ...options.headers,
      },
    });
  try {
    assert.equal((await request({ headers: { Cookie: "" } })).status, 401);
    assert.equal(
      (
        await request({
          method: "PUT",
          body: JSON.stringify({ data: file.data }),
          headers: { "X-Account-ID": "22" },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request({
          method: "PUT",
          body: JSON.stringify({ data: file.data }),
          headers: { Origin: "https://example.org" },
        })
      ).status,
      403,
    );
    assert.equal(
      (await request({ method: "PUT", body: JSON.stringify({ data: "Yg==" }) }))
        .status,
      422,
    );
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await request({
            method: "PUT",
            body: JSON.stringify({ data: file.data }),
          })
        ).status,
        200,
      );
    store.db.prepare("UPDATE attachments SET created=0").run();
    await request({ method: "PUT", body: JSON.stringify({ data: file.data }) });
    store.cleanup();
    assert.equal(store.attachment("11", file.id).data, file.data);
    const response = await request();
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { data: file.data });
    assert.equal(
      (
        await request({
          headers: { Cookie: `todo_session=${other}`, "X-Account-ID": "22" },
        })
      ).status,
      404,
    );
    const { snapshot, revision } = store.workspace("11");
    const next = withFile(snapshot);
    next.projects[0].todoList[0].task_attachments = attachmentMetadata([file]);
    store.save("11", next, revision, "operation-attachments-1");
    const foreign = withFile(store.workspace("22").snapshot);
    assert.throws(
      () => store.save("22", foreign, 1, "operation-attachments-2"),
      /Invalid/,
    );
    store.db.prepare("UPDATE attachments SET created=0").run();
    store.cleanup();
    assert.equal(store.attachment("11", file.id).data, file.data);
    const current = store.workspace("11");
    current.snapshot.projects[0].todoList = [];
    store.save(
      "11",
      current.snapshot,
      current.revision,
      "operation-attachments-3",
    );
    store.cleanup();
    assert.throws(() => store.attachment("11", file.id), /unavailable/);
  } finally {
    await app.close();
    store.close();
  }
});
test("offline attachment queue survives reload, retries a lost upload response and preserves draft on rejection", async () => {
  const memory = new MemoryStore();
  let offline = false,
    loseReply = true,
    reject = false;
  let snapshot = normalize({ projects: [] }),
    revision = 1;
  const uploads = new Map(),
    operations = new Set();
  const request = async (url, options) => {
    if (offline) throw new Error("offline");
    if (url.includes("/attachments/")) {
      assert.equal(options.headers["X-Account-ID"], "11");
      if (options.method === "PUT") {
        if (reject)
          return Response.json(
            { error: "Invalid attachment." },
            { status: 422 },
          );
        uploads.set(file.id, JSON.parse(options.body));
        if (loseReply) {
          loseReply = false;
          throw new Error("lost response");
        }
        return Response.json({ ok: true });
      }
      return Response.json(uploads.get(file.id));
    }
    if (url.includes("/operations/"))
      return Response.json({ applied: operations.has(url.split("/").at(-1)) });
    if (options.method === "PUT") {
      const next = JSON.parse(options.body);
      if (next.projects[0].todoList.length) assert.ok(uploads.has(file.id));
      snapshot = next;
      revision++;
      operations.add(options.headers["X-Operation-ID"]);
    }
    return Response.json({
      snapshot,
      revision,
      user: { id: "11", name: "Test" },
    });
  };
  let repository = new RemoteRepository("/api/workspace", {
    store: memory,
    request,
  });
  const base = await repository.load();
  offline = true;
  const pending = await repository.save(withFile(base), base);
  assert.equal(repository.status.pending, 1);
  repository = new RemoteRepository("/api/workspace", {
    store: memory,
    request,
  });
  assert.equal((await repository.load()).projects[0].todoList.length, 1);
  assert.equal((await repository.attachment(file)).data, file.data);
  offline = false;
  await repository.flush();
  assert.equal(repository.status.pending, 1);
  await repository.flush();
  assert.equal(repository.status.pending, 0);
  assert.equal(
    (await repository.exportDraft()).projects[0].todoList[0].task_attachments[0]
      .data,
    file.data,
  );
  const remove = structuredClone(pending);
  remove.projects[0].todoList = [];
  await repository.save(remove, pending);
  reject = true;
  await assert.rejects(repository.save(withFile(remove), remove), /Invalid/);
  assert.equal((await memory.read("user:11")).queue.length, 0);
  assert.equal((await repository.attachment(file)).data, file.data);
  // Account changes during the asynchronous blob read must not upload old bytes.
  offline = true;
  await repository.save(withFile(remove), remove);
  offline = false;
  const read = memory.read.bind(memory);
  memory.read = async (key) => {
    const value = await read(key);
    if (key.startsWith("attachment:")) {
      repository.epoch++;
      repository.user = { id: "22", name: "Other account" };
    }
    return value;
  };
  await assert.rejects(
    repository.flush(),
    (error) => error.authentication === true,
  );
  assert.equal((await memory.read("user:11")).queue.length, 1);
});

test("server accepts the actual 20 MiB boundary and rejects larger file bodies", () => {
  const store = new Store(":memory:");
  try {
    store.ensureUser({ id: 11 }, "11");
    const bytes = Buffer.alloc(attachmentLimits.bytes);
    const id = hash(bytes);
    store.putAttachment("11", id, bytes.toString("base64"));
    assert.equal(
      store.db
        .prepare("SELECT length(data) AS size FROM attachments WHERE id=?")
        .get(id).size,
      attachmentLimits.bytes,
    );
    assert.throws(
      () =>
        store.putAttachment(
          "11",
          id,
          Buffer.alloc(attachmentLimits.bytes + 1).toString("base64"),
        ),
      /Invalid/,
    );
  } finally {
    store.close();
  }
});

test("attachment HTTP timeout covers a stalled response body and remains retryable", async () => {
  const repository = new RemoteRepository("/api/workspace", {
    store: new MemoryStore(),
    request: async (_url, options) => ({
      ok: true,
      status: 200,
      json: () =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          ),
        ),
    }),
  });
  await assert.rejects(
    repository.api(`/api/attachments/${file.id}`, {}, 5),
    (error) => error.network === true,
  );
});
