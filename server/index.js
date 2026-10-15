import path from "node:path";
import { Store } from "./store.js";
import { createApp } from "./app.js";
import { TelegramBot } from "./telegram.js";
process.umask(0o077);
const origin = process.env.APP_ORIGIN || "http://localhost:4001",
  url = new URL(origin);
if (
  url.origin !== origin ||
  (!["https:"].includes(url.protocol) &&
    !["localhost", "127.0.0.1"].includes(url.hostname))
)
  throw new Error(
    "APP_ORIGIN: нужен HTTPS-домен без завершающего слеша или localhost.",
  );
const port = Number(process.env.PORT || 4001),
  token = process.env.TELEGRAM_BOT_TOKEN,
  username = process.env.TELEGRAM_BOT_USERNAME || "just_to_do_it_bot";
if (!/^\w{5,32}$/.test(username))
  throw new Error("Неверное имя Telegram-бота.");
const allowedIds = (process.env.TELEGRAM_ALLOWED_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  openRegistration = process.env.TELEGRAM_OPEN_REGISTRATION !== "false";
const store = new Store(
  path.resolve(process.env.DATABASE_PATH || "data/todo.sqlite"),
);
let botAvailable = false;
const app = createApp({
  store,
  origin,
  dist: process.env.DIST_DIR || "dist",
  botUsername: username,
  botReady: () => botAvailable,
  allowedIds,
  openRegistration,
});
const bot = token
  ? new TelegramBot({
      store,
      token,
      username,
      origin,
      allowedIds,
      openRegistration,
      onChange: app.notify,
    })
  : null;
let closing = false,
  retry,
  connection;
function connectBot() {
  if (!bot || closing) return;
  connection = (async () => {
    try {
      await bot.start();
      botAvailable = true;
    } catch (error) {
      if (!closing) {
        console.error(error.message);
        retry = setTimeout(connectBot, 30000);
        retry.unref();
      }
    }
  })();
}
app.server.listen(port, "127.0.0.1", () => {
  console.log(`Todo: ${origin}`);
  connectBot();
});
app.server.on("error", async () => {
  console.error("Не удалось запустить HTTP-сервер.");
  closing = true;
  clearTimeout(retry);
  await connection;
  await bot?.stop();
  store.close();
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    clearTimeout(retry);
    botAvailable = false;
    await app.close();
    await connection;
    await bot?.stop();
    store.close();
  });
