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
  const tasks = store
    .workspace(user.id)
    .snapshot.projects.flatMap((p) => p.todoList)
    .filter((t) => t.task_due_date === day && t.task_status !== "completed");
  return [
    `Задачи на ${day} (${settings.timezone})`,
    ...(tasks.length
      ? tasks.map((t, i) => `${i + 1}. ${t.task_title}`)
      : ["На сегодня нет незавершённых задач."]),
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
  taskFormButton() {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Добавить задачу по форме",
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
          "Доступ к приложению пока не разрешён.",
        );
      } else {
        this.store.ensureUser(from, chat);
        if (callback) {
          const [action, challengeId] = String(callback.data || "").split(":");
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
                ? "Вход подтверждён. Вернитесь в браузер."
                : "Запрос входа отклонён.",
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
                ? `Подтвердить вход в Todo на ${this.origin}? Нажимайте кнопку, только если вы сами открыли вход на этом адресе.`
                : "Запрос входа истёк. Начните вход заново в браузере.",
              result.changes
                ? {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: "Подтвердить вход",
                            callback_data: `approve:${challengeId}`,
                          },
                        ],
                        [
                          {
                            text: "Отклонить",
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
              "Откройте форму: укажите проект, описание, срок, статус и приоритет. Если вы ещё не вошли в этом браузере, сначала подтвердите вход через Telegram.",
              this.taskFormButton(),
            );
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
              "Ежедневная отправка отключена.",
            );
          } else if (text?.startsWith("/remind ")) {
            try {
              const [, time, timezone] = text.split(/\s+/),
                settings = validateSettings({ enabled: true, time, timezone });
              this.store.setSettings(id, settings);
              this.store.enqueue(
                `settings:${updateKey}`,
                chat,
                `Ежедневные задачи: ${time}, ${timezone}. Отключить: /stop`,
              );
            } catch {
              this.store.enqueue(
                `settings:${updateKey}`,
                chat,
                "Пример: /remind 09:00 Europe/Moscow",
              );
            }
          } else if (text?.startsWith("/")) {
            this.store.enqueue(
              `help:${updateKey}`,
              chat,
              "Отправьте текст — он станет задачей в Inbox. Первая строка — название, остальные — описание.\n/new — добавить задачу по форме\n/today — задачи на сегодня\n/remind 09:00 Europe/Moscow — ежедневная отправка\n/stop — отключить отправку\nВход начинайте в приложении.",
              this.taskFormButton(),
            );
          } else if (text) {
            try {
              this.store.addInbox(id, text, updateKey);
              changedUser = id;
            } catch (error) {
              if (error.status !== 422) throw error;
              this.store.enqueue(`limit:${updateKey}`, chat, error.message);
            }
          } else {
            this.store.enqueue(
              `unsupported:${updateKey}`,
              chat,
              "Пока поддерживаются текстовые сообщения. Отправьте задачу текстом.",
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
    await this.call("setMyCommands", {
      scope: { type: "all_private_chats" },
      commands: [
        { command: "new", description: "Добавить задачу по форме" },
        { command: "today", description: "Задачи на сегодня" },
        { command: "remind", description: "Настроить ежедневную отправку" },
        { command: "stop", description: "Отключить ежедневную отправку" },
        { command: "help", description: "Помощь" },
      ],
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
