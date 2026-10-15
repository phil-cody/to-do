// Изолированный стенд. Этот файл не используется сервером приложения.
import http from "node:http";
import { Store } from "../../server/store.js";
import { createApp } from "../../server/app.js";
import { TelegramBot } from "../../server/telegram.js";
const store = new Store(":memory:");
const app = createApp({
  store,
  origin: "http://localhost:4010",
  botReady: true,
  openRegistration: true,
});
let sequence = 0;
const bot = new TelegramBot({
  store,
  token: "test-only-fake-token",
  username: "just_to_do_it_bot",
  origin: "http://localhost:4010",
  openRegistration: true,
  onChange: app.notify,
  request: async () => ({
    ok: true,
    json: async () => ({ ok: true, result: {} }),
  }),
});
const controls = http.createServer(async (req, res) => {
  if (req.method === "POST") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const { user, challenge, text } = JSON.parse(raw);
    if (challenge) {
      bot.processUpdate({
        update_id: ++sequence,
        message: {
          from: { id: user, first_name: "Tester" },
          chat: { id: user, type: "private" },
          text: `/start login_${challenge}`,
        },
      });
      bot.processUpdate({
        update_id: ++sequence,
        callback_query: {
          id: String(sequence),
          from: { id: user },
          data: `approve:${challenge}`,
          message: { chat: { id: user, type: "private" } },
        },
      });
    } else if (text) {
      bot.processUpdate({
        update_id: ++sequence,
        message: {
          from: { id: user, first_name: "Tester" },
          chat: { id: user, type: "private" },
          text,
        },
      });
    }
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end("{}");
});
await new Promise((resolve) => app.server.listen(4010, "127.0.0.1", resolve));
await new Promise((resolve) => controls.listen(4011, "127.0.0.1", resolve));
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await app.close();
    controls.close();
    store.close();
  });
