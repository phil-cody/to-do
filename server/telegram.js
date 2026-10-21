import { accountLanguage, translate, validLanguage } from "../src/app/i18n.js";
import { hash } from "./store.js";
import { setTimeout as delay } from "node:timers/promises";
import { validateSettings } from "./validation.js";
export function calendar(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function digest(store, user, now = new Date()) {
  const settings = JSON.parse(user.settings),
    { day } = calendar(now, settings.timezone);
  const projects = store.workspace(user.id).snapshot.projects;
  const tasks = projects
    .flatMap((p) => p.todoList)
    .filter((t) => t.task_due_date === day && t.task_status !== "completed");
  const unassigned = projects
    .filter((p) => p.project_type === "inbox")
    .flatMap((p) => p.todoList)
    .filter((t) => t.task_status !== "completed");
  return [
    translate("Tasks for {day} ({timezone})", accountLanguage(settings), {
      day,
      timezone: settings.timezone,
    }),
    ...(tasks.length
      ? tasks.map((t, i) => `${i + 1}. ${t.task_title}`)
      : [
          translate(
            "There are no unfinished tasks for today.",
            accountLanguage(settings),
          ),
        ]),
    ...(unassigned.length
      ? [
          "",
          translate(
            "Unassigned Inbox tasks: {count}",
            accountLanguage(settings),
            { count: unassigned.length },
          ),
          ...unassigned.map((task, i) => `${i + 1}. ${task.task_title}`),
        ]
      : []),
  ].join("\n");
}
export function enqueueText(store, id, chatId, text, extra) {
  const chunks = [];
  while (text.length) {
    let size = Math.min(3500, text.length);
    if (size < text.length && /[\uD800-\uDBFF]/.test(text[size - 1])) size--;
    chunks.push(text.slice(0, size));
    text = text.slice(size);
  }
  chunks.forEach((chunk, i) =>
    store.enqueue(`${id}:${i}`, chatId, chunk, extra),
  );
}
export function botCommands(language) {
  return [
    ["new", "Add a task using the form"],
    ["today", "Today"],
    ["remind", "Configure daily delivery"],
    ["stop", "Disable daily delivery"],
    ["language", "Choose language"],
    ["help", "Help"],
  ].map(([command, description]) => ({
    command,
    description: translate(description, language),
  }));
}
export class TelegramBot {
  constructor({
    store,
    token,
    username,
    origin,
    allowedIds = [],
    openRegistration = false,
    onChange = () => {},
    request = fetch,
  }) {
    Object.assign(this, {
      store,
      token,
      username,
      origin,
      allowedIds,
      openRegistration,
      onChange,
      request,
    });
    this.stopped = true;
    this.identity = hash(`username:${username.toLowerCase()}`).slice(0, 16);
  }
  allowed(id) {
    return this.openRegistration || this.allowedIds.includes(String(id));
  }
  async call(method, payload, signal) {
    signal ||= this.controller?.signal;
    try {
      const response = await this.request(
        `https://api.telegram.org/bot${this.token}/${method}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(35000)])
            : AbortSignal.timeout(15000),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.ok) {
        const error = new Error("Telegram отклонил запрос.");
        error.retryAfter = body.parameters?.retry_after;
        error.permanent = body.error_code === 403;
        throw error;
      }
      return body.result;
    } catch (error) {
      if (error.name === "AbortError") throw error;
      const safe = new Error("Не удалось выполнить запрос к Telegram.");
      safe.retryAfter = error.retryAfter;
      safe.permanent = error.permanent;
      throw safe;
    }
  }
  taskFormButton(language) {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: translate("Add a task using the form", language),
              url: new URL("/#new-task", this.origin).href,
            },
          ],
        ],
      },
    };
  }
  processUpdate(update) {
    const updateKey = this.identity + ":" + update.update_id;
    let changedUser = null;
    this.store.transaction(() => {
      if (
        this.store.db.prepare("SELECT 1 FROM updates WHERE id=?").get(updateKey)
      )
        return;
      const callback = update.callback_query,
        message = callback?.message || update.message,
        from = callback?.from || message?.from;
      if (
        message?.chat?.type !== "private" ||
        !from ||
        from.is_bot ||
        String(from.id) !== String(message.chat.id)
      )
        return;
      const chat = String(message.chat.id),
        id = String(from.id);
      if (!this.allowed(id)) {
        this.store.enqueue(
          `denied:${updateKey}`,
          chat,
          translate(
            "Access to the app is not allowed yet.",
            from.language_code?.startsWith("ru") ? "ru" : "en",
          ),
        );
      } else {
        this.store.ensureUser(from, chat);
        let language = this.store.settings(id).language;
        const tr = (text, values) => translate(text, language, values);
        if (callback) {
          const [action, challengeId] = String(callback.data || "").split(":");
          if (action === "language" && validLanguage(challengeId)) {
            language = challengeId;
            this.store.setSettings(id, { language });
            changedUser = id;
            this.store.enqueue(
              `language:${updateKey}`,
              chat,
              tr("Language saved."),
            );
          }
          const row = this.store.db
            .prepare(
              "SELECT * FROM challenges WHERE id=? AND expires>? AND user_id=?",
            )
            .get(challengeId || "", Date.now(), id);
          if (row && !row.approved && ["approve", "deny"].includes(action)) {
            if (action === "approve")
              this.store.db
                .prepare("UPDATE challenges SET approved=1 WHERE id=?")
                .run(challengeId);
            else
              this.store.db
                .prepare("DELETE FROM challenges WHERE id=?")
                .run(challengeId);
            this.store.enqueue(
              `auth:${updateKey}`,
              chat,
              action === "approve"
                ? tr("Sign-in confirmed. Return to your browser.")
                : tr("Sign-in request rejected."),
            );
          }
          // Answering callback removes the spinner; it does not grant a session.
          this.store.db
            .prepare("INSERT OR IGNORE INTO metadata VALUES(?,?)")
            .run(
              `callback:${callback.id}`,
              JSON.stringify({ callback_query_id: callback.id }),
            );
        } else {
          const text = message.text?.trim();
          if (text?.startsWith("/start login_")) {
            const challengeId = text.slice("/start login_".length).trim();
            const result = this.store.db
              .prepare(
                "UPDATE challenges SET user_id=? WHERE id=? AND expires>? AND approved=0 AND (user_id IS NULL OR user_id=?)",
              )
              .run(id, challengeId, Date.now(), id);
            this.store.enqueue(
              `login:${updateKey}`,
              chat,
              result.changes
                ? tr(
                    "Confirm sign-in to Todo at {origin}? Only press the button if you started sign-in at this address yourself.",
                    { origin: this.origin },
                  )
                : tr(
                    "The sign-in request has expired. Start again in your browser.",
                  ),
              result.changes
                ? {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: tr("Confirm sign-in"),
                            callback_data: `approve:${challengeId}`,
                          },
                        ],
                        [
                          {
                            text: tr("Decline"),
                            callback_data: `deny:${challengeId}`,
                          },
                        ],
                      ],
                    },
                  }
                : {},
            );
          } else if (text === "/new" || text === `/new@${this.username}`) {
            this.store.enqueue(
              `new:${updateKey}`,
              chat,
              tr(
                "Open the form to choose a project, description, due date, status and priority. If you are not signed in in this browser, confirm sign-in via Telegram first.",
              ),
              this.taskFormButton(language),
            );
          } else if (/^\/language(?:@[\w]+)?(?:\s|$)/.test(text || "")) {
            const choice = text.split(/\s+/)[1];
            if (validLanguage(choice)) {
              language = choice;
              this.store.setSettings(id, { language });
              changedUser = id;
              this.store.enqueue(
                `language:${updateKey}`,
                chat,
                tr("Language saved."),
              );
            } else {
              this.store.enqueue(
                `language:${updateKey}`,
                chat,
                tr(
                  choice
                    ? "Use /language en or /language ru."
                    : "Choose a language:",
                ),
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: tr("English"), callback_data: "language:en" },
                        { text: tr("Russian"), callback_data: "language:ru" },
                      ],
                    ],
                  },
                },
              );
            }
          } else if (text === "/today") {
            enqueueText(
              this.store,
              `today:${updateKey}`,
              chat,
              digest(this.store, this.store.user(id)),
            );
          } else if (text === "/stop") {
            const s = JSON.parse(this.store.user(id).settings);
            s.enabled = false;
            this.store.setSettings(id, s);
            this.store.enqueue(
              `stop:${updateKey}`,
              chat,
              tr("Daily delivery disabled."),
            );
          } else if (text?.startsWith("/remind ")) {
            try {
              const [, time, timezone] = text.split(/\s+/),
                settings = validateSettings({ enabled: true, time, timezone });
              this.store.setSettings(id, settings);
              this.store.enqueue(
                `settings:${updateKey}`,
                chat,
                tr("Daily tasks: {time}, {timezone}. Disable: /stop", {
                  time,
                  timezone,
                }),
              );
            } catch {
              this.store.enqueue(
                `settings:${updateKey}`,
                chat,
                tr("Example: /remind 09:00 Europe/Moscow"),
              );
            }
          } else if (text?.startsWith("/")) {
            this.store.enqueue(
              `help:${updateKey}`,
              chat,
              tr(
                "Send text to create an Inbox task. The first line is the title; the rest is the description.\n/new — add a task using the form\n/today — today's tasks\n/remind 09:00 Europe/Moscow — daily delivery\n/stop — disable delivery\n/language — choose language\nStart sign-in in the app.",
              ),
              this.taskFormButton(language),
            );
          } else if (text) {
            try {
              this.store.addInbox(id, text, updateKey);
              changedUser = id;
            } catch (error) {
              if (error.status !== 422) throw error;
              this.store.enqueue(`limit:${updateKey}`, chat, tr(error.message));
            }
          } else {
            this.store.enqueue(
              `unsupported:${updateKey}`,
              chat,
              tr("Only text messages are supported. Send a task as text."),
            );
          }
        }
      }
      this.store.db
        .prepare("INSERT INTO updates VALUES(?,?)")
        .run(updateKey, Date.now());
    });
    if (changedUser) this.onChange(changedUser);
  }
  schedule(now = new Date()) {
    this.store.transaction(() => {
      for (const user of this.store.db
        .prepare("SELECT * FROM users WHERE chat_id IS NOT NULL")
        .all()) {
        if (!this.allowed(user.id)) continue;
        const settings = JSON.parse(user.settings);
        if (!settings.enabled) continue;
        const { day, time } = calendar(now, settings.timezone);
        if (time < settings.time) continue;
        const result = this.store.db
          .prepare("INSERT OR IGNORE INTO digests VALUES(?,?)")
          .run(user.id, day);
        if (result.changes)
          enqueueText(
            this.store,
            `digest:${user.id}:${day}`,
            user.chat_id,
            digest(this.store, user, now),
          );
      }
    });
  }
  async deliver() {
    if (this.delivering) return;
    this.delivering = true;
    try {
      for (const row of this.store.db
        .prepare("SELECT * FROM metadata WHERE key LIKE 'commands:%' LIMIT 20")
        .all()) {
        try {
          const { chat, language } = JSON.parse(row.value);
          await this.call("setMyCommands", {
            scope: { type: "chat", chat_id: chat },
            commands: botCommands(language),
          });
          this.store.db
            .prepare("DELETE FROM metadata WHERE key=? AND value=?")
            .run(row.key, row.value);
        } catch {
          /* Keep the job for a later retry. */
        }
      }
      const callbacks = this.store.db
        .prepare("SELECT * FROM metadata WHERE key LIKE 'callback:%' LIMIT 20")
        .all();
      for (const row of callbacks) {
        try {
          await this.call("answerCallbackQuery", JSON.parse(row.value));
        } catch {
          /* Old callbacks expire in Telegram. */
        }
        this.store.db.prepare("DELETE FROM metadata WHERE key=?").run(row.key);
      }
      for (const row of this.store.db
        .prepare(
          "SELECT * FROM outbox WHERE available<=? ORDER BY available LIMIT 20",
        )
        .all(Date.now())) {
        if (this.stopping) break;
        try {
          await this.call("sendMessage", {
            chat_id: row.chat_id,
            link_preview_options: { is_disabled: true },
            ...JSON.parse(row.payload),
          });
          this.store.db.prepare("DELETE FROM outbox WHERE id=?").run(row.id);
        } catch (error) {
          if (error.permanent) {
            this.store.db.prepare("DELETE FROM outbox WHERE id=?").run(row.id);
            const user = this.store.user(row.chat_id);
            if (user) {
              const settings = JSON.parse(user.settings);
              settings.enabled = false;
              this.store.setSettings(user.id, settings);
            }
          } else {
            this.store.db
              .prepare(
                "UPDATE outbox SET attempts=attempts+1,available=? WHERE id=?",
              )
              .run(
                Date.now() +
                  1000 *
                    Math.max(
                      error.retryAfter || 0,
                      Math.min(3600, 2 ** Math.min(row.attempts + 1, 12)),
                    ),
                row.id,
              );
            break;
          }
        }
      }
    } finally {
      this.delivering = false;
    }
  }
  async start() {
    const me = await this.call("getMe", {});
    this.identity = hash(`bot:${me.id}`).slice(0, 16);
    if (me.username.toLowerCase() !== this.username.toLowerCase())
      throw new Error("TELEGRAM_BOT_USERNAME не совпадает с токеном.");
    const webhook = await this.call("getWebhookInfo", {});
    if (webhook.url)
      throw new Error(
        "У бота включён webhook. Отключите его перед запуском long polling.",
      );
    for (const language of ["en", "ru"])
      await this.call("setMyCommands", {
        scope: { type: "all_private_chats" },
        ...(language === "ru" ? { language_code: "ru" } : {}),
        commands: botCommands(language),
      }).catch(() => {});
    this.stopped = false;
    this.stopping = false;
    this.controller = new AbortController();
    this.timer = setInterval(() => {
      this.schedule();
      void this.deliver();
    }, 15000);
    this.schedule();
    void this.deliver();
    this.polling = this.poll();
  }
  async poll() {
    const key = `offset:${this.identity}`;
    while (!this.stopped) {
      try {
        const offset = Number(
          this.store.db
            .prepare("SELECT value FROM metadata WHERE key=?")
            .get(key)?.value || 0,
        );
        const updates = await this.call(
          "getUpdates",
          {
            offset,
            timeout: 25,
            allowed_updates: ["message", "callback_query"],
          },
          this.controller.signal,
        );
        for (const update of updates) {
          this.processUpdate(update);
          this.store.db
            .prepare(
              "INSERT INTO metadata VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            )
            .run(key, String(update.update_id + 1));
        }
        void this.deliver();
      } catch {
        if (!this.stopped)
          await delay(3000, undefined, {
            signal: this.controller.signal,
          }).catch(() => {});
      }
    }
  }
  async stop() {
    this.stopping = true;
    this.stopped = true;
    clearInterval(this.timer);
    this.controller?.abort();
    await this.polling;
    while (this.delivering)
      await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
