import test from "node:test";
import assert from "node:assert/strict";
import { Store, hash } from "../server/store.js";
import { createApp } from "../server/app.js";
import {
  TelegramBot,
  calendar,
  digest,
  botCommands,
} from "../server/telegram.js";
import { validateSnapshot, validateSettings } from "../server/validation.js";
function setup() {
  const store = new Store(":memory:"),
    sent = [];
  const bot = new TelegramBot({
    store,
    token: "fake-token-for-tests",
    username: "just_to_do_it_bot",
    origin: "http://localhost",
    openRegistration: true,
    request: async (_url, options) => {
      sent.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    },
  });
  return { store, bot, sent };
}
const message = (updateId, id, text) => ({
  update_id: updateId,
  message: {
    message_id: updateId,
    chat: { id, type: "private" },
    from: { id, first_name: "Test" },
    text,
  },
});
function approve(bot, id, challenge, updateId = 2) {
  bot.processUpdate({
    update_id: updateId,
    callback_query: {
      id: String(updateId),
      from: { id },
      data: `approve:${challenge}`,
      message: { chat: { id, type: "private" } },
    },
  });
}
test("Telegram login requires confirmation, browser binding, expiry and unique use", () => {
  const { store, bot } = setup();
  try {
    const { id, binding } = store.challenge();
    bot.processUpdate(message(1, 11, `/start login_${id}`));
    assert.equal(store.getChallenge(id, binding).approved, 0);
    assert.equal(store.getChallenge(id, "wrong"), undefined);
    approve(bot, 22, id);
    assert.equal(store.getChallenge(id, binding).approved, 0);
    approve(bot, 11, id, 3);
    assert.equal(store.getChallenge(id, binding).approved, 1);
    store.db.prepare("UPDATE challenges SET expires=0 WHERE id=?").run(id);
    assert.equal(store.getChallenge(id, binding), undefined);
  } finally {
    store.close();
  }
});
test("Private messages create Inbox tasks once, users are isolated, groups ignored", async () => {
  const { store, bot, sent } = setup();
  try {
    const update = message(1, 11, "Buy milk\nTwo bottles");
    bot.processUpdate(update);
    bot.processUpdate(update);
    bot.processUpdate(message(2, 22, "Separate task"));
    bot.processUpdate({
      ...message(3, 11, "Secret"),
      message: {
        ...message(3, 11, "Secret").message,
        chat: { id: -11, type: "group" },
      },
    });
    const first = store.workspace("11").snapshot.projects[0].todoList;
    assert.equal(first.length, 1);
    assert.equal(first[0].task_title, "Buy milk");
    assert.equal(first[0].task_description, "Two bottles");
    assert.equal(
      store.workspace("22").snapshot.projects[0].todoList[0].task_title,
      "Separate task",
    );
    await bot.deliver();
    assert.equal(sent.filter((x) => x.text?.startsWith("Добавлено")).length, 2);
  } finally {
    store.close();
  }
});
test("Revision checks, idempotency, validation and session revocation", () => {
  const { store } = setup();
  try {
    store.ensureUser({ id: 11 }, 11);
    const { snapshot, revision } = store.workspace("11");
    snapshot.projects[0].project_title = "Changed";
    const saved = store.save("11", snapshot, revision, "operation-12345678");
    assert.equal(saved.revision, revision + 1);
    assert.equal(
      store.save("11", snapshot, revision, "operation-12345678").revision,
      revision + 1,
    );
    assert.throws(
      () => store.save("11", snapshot, revision, "operation-other123"),
      (e) => e.status === 409,
    );
    const bad = structuredClone(snapshot);
    bad.projects[0].project_id = "changed";
    assert.throws(
      () => store.save("11", bad, saved.revision, "operation-new123456"),
      (e) => e.status === 422,
    );
    assert.throws(
      () => validateSnapshot({ projects: [] }),
      (e) => e.status === 422,
    );
    assert.throws(() =>
      validateSettings({ enabled: true, time: "29:00", timezone: "UTC" }),
    );
    assert.throws(() =>
      validateSettings({
        enabled: true,
        time: "09:00",
        timezone: "Invalid/Zone",
      }),
    );
    const secret = store.session("11");
    assert.equal(store.authenticate(secret).id, "11");
    assert.ok(
      store.db.prepare("SELECT hash FROM sessions").get().hash === hash(secret),
    );
    store.revoke(secret);
    assert.equal(store.authenticate(secret), null);
  } finally {
    store.close();
  }
});
test("Daily digest respects timezone and schedule, queues only once a day", () => {
  const { store, bot } = setup();
  try {
    bot.processUpdate(message(1, 11, "/remind 09:00 Asia/Ho_Chi_Minh"));
    const now = new Date("2026-10-15T02:00:00Z");
    assert.deepEqual(calendar(now, "Asia/Ho_Chi_Minh"), {
      day: "2026-10-15",
      time: "09:00",
    });
    bot.schedule(new Date("2026-10-15T01:59:00Z"));
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM digests").get().n,
      0,
    );
    bot.schedule(now);
    bot.schedule(now);
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM digests").get().n,
      1,
    );
    assert.equal(
      store.db
        .prepare("SELECT COUNT(*) AS n FROM outbox WHERE id LIKE 'digest:%'")
        .get().n,
      1,
    );
    bot.processUpdate(message(2, 11, "/stop"));
    bot.schedule(new Date("2026-10-16T02:00:00Z"));
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM digests").get().n,
      1,
    );
  } finally {
    store.close();
  }
});
test("HTTP API enforces session ownership, Origin, optimistic writes and one-time login", async () => {
  const { store, bot } = setup();
  const app = createApp({
    store,
    origin: "http://127.0.0.1:4018",
    botReady: true,
    openRegistration: true,
  });
  await new Promise((resolve) => app.server.listen(4018, "127.0.0.1", resolve));
  const request = (route, options = {}) =>
    fetch("http://127.0.0.1:4018" + route, {
      ...options,
      headers: {
        Origin: "http://127.0.0.1:4018",
        "Content-Type": "application/json",
        ...(options.method === "PUT" ? { "X-Account-ID": "11" } : {}),
        ...options.headers,
      },
    });
  try {
    assert.equal((await request("/api/workspace")).status, 401);
    assert.equal(
      (
        await request("/api/auth/telegram", {
          method: "POST",
          headers: { Origin: "https://evil.example" },
          body: "{}",
        })
      ).status,
      403,
    );
    let response = await request("/api/auth/telegram", {
      method: "POST",
      body: "{}",
    });
    const challenge = await response.json(),
      binding = response.headers.get("set-cookie").split(";")[0];
    bot.processUpdate(message(1, 11, `/start login_${challenge.id}`));
    approve(bot, 11, challenge.id);
    assert.equal(
      (
        await request("/api/auth/complete", {
          method: "POST",
          body: JSON.stringify({ id: challenge.id }),
        })
      ).status,
      410,
    );
    response = await request("/api/auth/complete", {
      method: "POST",
      headers: { Cookie: binding },
      body: JSON.stringify({ id: challenge.id }),
    });
    assert.equal(response.status, 200);
    const session = response.headers.get("set-cookie").split(";")[0];
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.equal(
      (
        await request("/api/auth/complete", {
          method: "POST",
          headers: { Cookie: binding },
          body: JSON.stringify({ id: challenge.id }),
        })
      ).status,
      410,
    );
    response = await request("/api/workspace", {
      headers: { Cookie: session },
    });
    const data = await response.json();
    assert.equal(data.user.id, "11");
    const foreign = store.ensureUser({ id: 22 }, 22),
      foreignCookie = "todo_session=" + store.session(foreign);
    const other = await (
      await request("/api/workspace", { headers: { Cookie: foreignCookie } })
    ).json();
    assert.notEqual(
      other.snapshot.projects[0].project_id,
      data.snapshot.projects[0].project_id,
    );
    for (const [route, method] of [
      ["/api/workspace", "GET"],
      ["/api/me", "GET"],
      ["/api/settings", "PUT"],
      ["/api/auth/logout", "POST"],
      ["/api/workspace", "PUT"],
    ]) {
      const rejected = await request(route, {
        method,
        headers: { Cookie: foreignCookie, "X-Account-ID": "11" },
        ...(method !== "GET" ? { body: JSON.stringify(data.snapshot) } : {}),
      });
      assert.equal(rejected.status, 401, `${method} ${route}`);
      assert.equal((await rejected.json()).snapshot, undefined);
    }
    assert.equal(store.workspace("22").revision, other.revision);
    assert.ok(store.authenticate(foreignCookie.split("=")[1]));
    const unbound = await fetch("http://127.0.0.1:4018/api/workspace", {
      method: "PUT",
      headers: {
        Cookie: session,
        Origin: "http://127.0.0.1:4018",
        "Content-Type": "application/json",
        "If-Match": String(data.revision),
        "X-Operation-ID": "operation-unbound1234",
      },
      body: JSON.stringify(data.snapshot),
    });
    assert.equal(unbound.status, 428);
    assert.equal(store.workspace("11").revision, data.revision);
    assert.equal(
      (
        await request("/api/workspace", {
          method: "PUT",
          headers: { Cookie: session, "X-Account-ID": "" },
          body: JSON.stringify(data.snapshot),
        })
      ).status,
      401,
    );
    data.snapshot.projects[0].project_title = "Only mine";
    response = await request("/api/workspace", {
      method: "PUT",
      headers: {
        Cookie: session,
        "If-Match": String(data.revision),
        "X-Operation-ID": "operation-http123456",
      },
      body: JSON.stringify(data.snapshot),
    });
    assert.equal(response.status, 200);
    assert.notEqual(
      store.workspace("22").snapshot.projects[0].project_title,
      "Only mine",
    );
    assert.equal(
      (
        await request("/api/workspace", {
          method: "PUT",
          headers: {
            Cookie: session,
            "If-Match": String(data.revision),
            "X-Operation-ID": "operation-http223456",
          },
          body: JSON.stringify(data.snapshot),
        })
      ).status,
      409,
    );
    const initialSettings = store.settings("11");
    const languageResponse = await request("/api/settings", {
      method: "PUT",
      headers: { Cookie: session },
      body: JSON.stringify({ language: "en" }),
    });
    assert.equal(languageResponse.status, 200);
    assert.deepEqual(await languageResponse.json(), {
      ...initialSettings,
      language: "en",
    });
    assert.equal(
      (
        await (
          await request("/api/workspace", { headers: { Cookie: session } })
        ).json()
      ).user.language,
      "en",
    );
    const invalidLanguage = await request("/api/settings", {
      method: "PUT",
      headers: { Cookie: session, "Accept-Language": "en" },
      body: JSON.stringify({ language: "fr" }),
    });
    assert.equal(invalidLanguage.status, 422);
    assert.equal(
      (await invalidLanguage.json()).error,
      "Choose a valid language: en or ru.",
    );
    assert.equal(store.settings("11").language, "en");
    assert.equal(store.settings("22").language, "ru");
    await request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: session },
      body: "{}",
    });
    assert.equal(
      (await request("/api/workspace", { headers: { Cookie: session } }))
        .status,
      401,
    );
  } finally {
    await app.close();
    store.close();
  }
});

test("Bot language choice is per-account, idempotent and shared with schedule, messages and command menus", async () => {
  const { store, bot, sent } = setup();
  try {
    store.ensureUser({ id: 11, language_code: "en" }, 11);
    store.ensureUser({ id: 22, language_code: "ru" }, 22);
    store.setSettings("11", {
      enabled: true,
      time: "10:30",
      timezone: "Asia/Ho_Chi_Minh",
    });
    bot.processUpdate(message(1, 11, "/language"));
    await bot.deliver();
    assert.ok(sent.some((payload) => payload.text === "Choose a language:"));
    assert.deepEqual(
      sent
        .find((payload) => payload.text === "Choose a language:")
        .reply_markup.inline_keyboard[0].map((item) => item.callback_data),
      ["language:en", "language:ru"],
    );
    bot.processUpdate({
      update_id: 2,
      callback_query: {
        id: "language-choice",
        from: { id: 11 },
        data: "language:ru",
        message: { chat: { id: 11, type: "private" } },
      },
    });
    assert.deepEqual(store.settings("11"), {
      enabled: true,
      time: "10:30",
      timezone: "Asia/Ho_Chi_Minh",
      language: "ru",
    });
    const english = message(3, 11, "/language en");
    bot.processUpdate(english);
    bot.processUpdate(english);
    bot.processUpdate(message(4, 11, "/remind 09:15 UTC"));
    assert.equal(store.settings("11").language, "en");
    assert.equal(store.settings("22").language, "ru");
    bot.processUpdate(message(5, 11, "/language fr"));
    bot.processUpdate(message(6, 11, "/help"));
    bot.processUpdate(message(7, 11, "/new"));
    bot.processUpdate(message(8, 11, "Original task title"));
    bot.processUpdate(message(9, 11, "/today"));
    await bot.deliver();
    assert.equal(
      sent.filter((payload) => payload.text === "Language saved.").length,
      1,
    );
    assert.ok(
      sent.some(
        (payload) => payload.text === "Use /language en or /language ru.",
      ),
    );
    assert.ok(
      sent.some(
        (payload) => payload.text === "Added to Inbox: Original task title",
      ),
    );
    assert.ok(
      sent.some(
        (payload) =>
          payload.scope?.chat_id === "11" &&
          payload.commands?.some(
            (command) =>
              command.command === "language" &&
              command.description === "Choose language",
          ),
      ),
    );
    assert.ok(digest(store, store.user("11")).startsWith("Tasks for "));
    assert.ok(digest(store, store.user("22")).startsWith("Задачи на "));
    assert.equal(store.workspace("11").snapshot.projects[0].todoList.length, 1);
    assert.equal(
      store.workspace("11").snapshot.projects[0].todoList[0].task_title,
      "Original task title",
    );
    for (const command of botCommands("en"))
      assert.doesNotMatch(command.description, /[а-яё]/i);
  } finally {
    store.close();
  }
});

test("Rotating a bot token does not reapply an already processed Inbox update", () => {
  const { store, bot } = setup();
  try {
    const update = message(99, 11, "Exactly one task");
    bot.processUpdate(update);
    const replacement = new TelegramBot({
      store,
      token: "rotated-test-token",
      username: "just_to_do_it_bot",
      origin: "http://localhost",
      openRegistration: true,
    });
    replacement.processUpdate(update);
    assert.equal(store.workspace("11").snapshot.projects[0].todoList.length, 1);
  } finally {
    store.close();
  }
});

test("Telegram form command preserves the HTTPS port, provides a safe link and creates no task", async () => {
  const { store, bot, sent } = setup();
  try {
    bot.origin = "https://justtodoit.duckdns.org:8443";
    bot.processUpdate(message(1, 11, "/new"));
    bot.processUpdate(message(1, 11, "/new"));
    bot.processUpdate(message(2, 11, "/help"));
    await bot.deliver();
    const messages = sent.filter((payload) => payload.text);
    assert.equal(messages.length, 2);
    for (const response of messages) {
      assert.equal(response.chat_id, "11");
      assert.equal(
        response.reply_markup.inline_keyboard[0][0].url,
        "https://justtodoit.duckdns.org:8443/#new-task",
      );
      assert.equal(
        new URL(response.reply_markup.inline_keyboard[0][0].url).search,
        "",
      );
    }
    assert.equal(store.workspace("11").snapshot.projects[0].todoList.length, 0);
    bot.processUpdate(message(3, 11, "Task from plain text"));
    assert.equal(store.workspace("11").snapshot.projects[0].todoList.length, 1);
  } finally {
    store.close();
  }
});

test("Telegram cannot grow a workspace beyond the same byte limit as file import", async () => {
  const { store, bot, sent } = setup();
  try {
    store.ensureUser({ id: 11 }, 11);
    const { snapshot, revision } = store.workspace("11");
    const project = snapshot.projects[0];
    project.todoList = Array.from({ length: 20 }, (_, index) => ({
      task_id: `large-${index}`,
      task_project: project.project_id,
      task_title: `Task ${index}`,
      task_description: "a".repeat(100000),
      task_status: "pending",
      task_priority: "low",
      task_due_date: "",
      task_createdAt: "",
    }));
    const reduction =
      Buffer.byteLength(JSON.stringify(snapshot), "utf8") - 2_000_000 + 1000;
    project.todoList.at(-1).task_description = project.todoList
      .at(-1)
      .task_description.slice(0, -reduction);
    const saved = store.save("11", snapshot, revision, "size-check-operation");
    bot.processUpdate(message(999, 11, "Task too large\n" + "b".repeat(4000)));
    assert.equal(store.workspace("11").revision, saved.revision);
    assert.equal(
      store.workspace("11").snapshot.projects[0].todoList.length,
      20,
    );
    await bot.deliver();
    assert.ok(sent.some((payload) => payload.text?.includes("2 МБ")));
  } finally {
    store.close();
  }
});

test("Changing language while a command menu request is in flight preserves the newer menu job", async () => {
  const { store, bot } = setup();
  try {
    store.ensureUser({ id: 11, language_code: "ru" }, 11);
    bot.request = async () => {
      store.setSettings("11", { language: "en" });
      return { ok: true, json: async () => ({ ok: true, result: true }) };
    };
    await bot.deliver();
    const pending = store.db
      .prepare("SELECT value FROM metadata WHERE key=?")
      .get("commands:11");
    assert.equal(JSON.parse(pending.value).language, "en");
  } finally {
    store.close();
  }
});

test("daily digest includes only unfinished Inbox tasks in the account language even without due tasks", () => {
  const { store, bot } = setup();
  try {
    bot.processUpdate(message(1, 11, "Unassigned item"));
    bot.processUpdate(message(2, 11, "Finished item"));
    const current = store.workspace("11");
    current.snapshot.projects[0].todoList[1].task_status = "completed";
    store.save("11", current.snapshot, current.revision, "inbox-digest-test-1");
    const russian = digest(
      store,
      store.user("11"),
      new Date("2026-10-21T08:00:00Z"),
    );
    assert.match(russian, /Нераспределённые задачи во «Входящих»: 1/);
    assert.match(russian, /Unassigned item/);
    assert.doesNotMatch(russian, /Finished item/);
    store.setSettings("11", { language: "en" });
    assert.match(digest(store, store.user("11")), /Unassigned Inbox tasks: 1/);
    const next = store.workspace("11");
    next.snapshot.projects[0].todoList[0].task_status = "completed";
    store.save("11", next.snapshot, next.revision, "inbox-digest-test-2");
    assert.doesNotMatch(digest(store, store.user("11")), /Unassigned Inbox/);
  } finally {
    store.close();
  }
});
