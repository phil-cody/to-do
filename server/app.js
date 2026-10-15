import http from "node:http";
import { isIP } from "node:net";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { workspaceLimits } from "../src/app/model.js";
import { ApiError, validateSettings } from "./validation.js";
import { hash } from "./store.js";
import { translate } from "../src/app/i18n.js";
const cookieMap = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "").split(";").map((v) => v.trim().split("=")),
  );
const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};
async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > workspaceLimits.requestBytes)
      throw new ApiError(413, "Слишком большой запрос.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    throw new ApiError(400, "Некорректный JSON.");
  }
}
export function createApp({
  store,
  origin,
  dist = "dist",
  botUsername = "just_to_do_it_bot",
  botReady = false,
  openRegistration = false,
  allowedIds = [],
}) {
  const url = new URL(origin),
    secure = url.protocol === "https:",
    sessionName = secure ? "__Host-todo_session" : "todo_session",
    loginName = secure ? "__Host-todo_login" : "todo_login";
  const clients = new Set(),
    limits = new Map();
  const cookie = (name, value, age) =>
    `${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const allowed = (id) => openRegistration || allowedIds.includes(String(id));
  const telegramReady = () =>
    typeof botReady === "function" ? botReady() : botReady;
  function notify(id) {
    for (const client of clients)
      if (client.userId === id)
        client.res.write(
          `event: revision\ndata: ${store.workspace(id).revision}\n\n`,
        );
  }
  function rate(req, key, max) {
    const now = Date.now(),
      ip =
        (isIP(req.headers["x-real-ip"] || "")
          ? req.headers["x-real-ip"]
          : req.socket.remoteAddress) +
        ":" +
        key,
      row = limits.get(ip);
    if (!row || row.until < now) {
      if (limits.size > 10000) limits.clear();
      limits.set(ip, { count: 1, until: now + 60000 });
    } else if (++row.count > max)
      throw new ApiError(
        429,
        "Слишком много запросов. Повторите через минуту.",
      );
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    try {
      if (req.headers.host !== url.host)
        throw new ApiError(403, "Неверный адрес приложения.");
      const pathname = new URL(req.url, origin).pathname;
      if (pathname === "/api/health" && req.method === "GET")
        return json(res, 200, { ok: true });
      if (pathname.startsWith("/api/")) {
        rate(req, "api", 2400);
        if (!["GET", "POST", "PUT"].includes(req.method))
          throw new ApiError(405, "Метод не поддерживается.");
        if (
          req.headers["sec-fetch-site"] === "cross-site" ||
          (!["GET", "HEAD"].includes(req.method) &&
            req.headers.origin !== url.origin)
        )
          throw new ApiError(403, "Запрос должен исходить из приложения.");
        if (
          !["GET", "HEAD"].includes(req.method) &&
          !(req.headers["content-type"] || "").startsWith("application/json")
        )
          throw new ApiError(415, "Ожидается application/json.");
        const cookies = cookieMap(req);
        if (pathname === "/api/config" && req.method === "GET")
          return json(res, 200, {
            telegramReady: telegramReady(),
            botUsername,
          });
        if (pathname === "/api/auth/telegram" && req.method === "POST") {
          rate(req, "login", 5);
          if (!telegramReady())
            throw new ApiError(503, "Telegram-бот ещё не настроен на сервере.");
          const previous = cookies[loginName];
          if (previous)
            store.db
              .prepare("DELETE FROM challenges WHERE binding=?")
              .run(hash(previous));
          const challenge = store.challenge();
          res.setHeader(
            "Set-Cookie",
            cookie(loginName, challenge.binding, 300),
          );
          return json(res, 201, {
            id: challenge.id,
            url: `https://t.me/${botUsername}?start=login_${challenge.id}`,
            expiresIn: 300,
          });
        }
        if (pathname === "/api/auth/complete" && req.method === "POST") {
          const input = await body(req),
            challenge = store.getChallenge(
              String(input?.id || ""),
              cookies[loginName],
            );
          if (!challenge)
            throw new ApiError(410, "Запрос входа истёк или отклонён.");
          if (!challenge.approved) return json(res, 202, { pending: true });
          if (!allowed(challenge.user_id))
            throw new ApiError(403, "Доступ к приложению не разрешён.");
          const secret = store.transaction(() => {
            const removed = store.db
              .prepare("DELETE FROM challenges WHERE id=?")
              .run(challenge.id);
            if (removed.changes !== 1)
              throw new ApiError(410, "Запрос входа уже использован.");
            store.revoke(cookies[sessionName]);
            return store.session(challenge.user_id);
          });
          res.setHeader("Set-Cookie", [
            cookie(sessionName, secret, 30 * 86400),
            cookie(loginName, "", 0),
          ]);
          return json(res, 200, { ok: true });
        }
        const user = store.authenticate(cookies[sessionName]);
        if (!user || !allowed(user.id))
          throw new ApiError(401, "Войдите через Telegram.");
        const accountId = req.headers["x-account-id"];
        if (accountId !== undefined && accountId !== user.id)
          throw new ApiError(401, "Аккаунт изменился. Войдите повторно.");
        // A stale tab must never send its offline draft into a new session.
        if (pathname === "/api/workspace" && req.method === "PUT" && !accountId)
          throw new ApiError(428, "Обновите приложение перед сохранением.");
        if (pathname === "/api/auth/logout" && req.method === "POST") {
          store.revoke(cookies[sessionName]);
          res.setHeader("Set-Cookie", cookie(sessionName, "", 0));
          for (const c of clients)
            if (c.session === cookies[sessionName]) c.res.end();
          return json(res, 200, { ok: true });
        }
        if (pathname === "/api/me" && req.method === "GET")
          return json(res, 200, {
            id: user.id,
            name: user.name,
            settings: store.settings(user.id),
          });
        if (pathname === "/api/settings" && req.method === "PUT") {
          const settings = validateSettings({
            ...store.settings(user.id),
            ...(await body(req)),
          });
          store.transaction(() => store.setSettings(user.id, settings));
          notify(user.id);
          return json(res, 200, settings);
        }
        if (pathname.startsWith("/api/operations/") && req.method === "GET") {
          const id = pathname.slice("/api/operations/".length);
          return json(res, 200, {
            applied: !!store.db
              .prepare("SELECT 1 FROM operations WHERE user_id=? AND id=?")
              .get(user.id, id),
          });
        }
        if (pathname === "/api/workspace" && req.method === "GET") {
          const data = store.workspace(user.id);
          res.setHeader("ETag", `"${data.revision}"`);
          return json(res, 200, {
            ...data,
            user: {
              id: user.id,
              name: user.name,
              language: store.settings(user.id).language,
            },
          });
        }
        if (pathname === "/api/workspace" && req.method === "PUT") {
          const revision = Number(
              (req.headers["if-match"] || "").replaceAll('"', ""),
            ),
            operationId = req.headers["x-operation-id"];
          if (!Number.isSafeInteger(revision) || revision < 1)
            throw new ApiError(428, "Нужна текущая ревизия If-Match.");
          if (
            typeof operationId !== "string" ||
            !/^[-\w]{16,100}$/.test(operationId)
          )
            throw new ApiError(422, "Нужен уникальный X-Operation-ID.");
          const result = store.save(
            user.id,
            await body(req),
            revision,
            operationId,
          );
          notify(user.id);
          res.setHeader("ETag", `"${result.revision}"`);
          return json(res, 200, result);
        }
        if (pathname === "/api/events" && req.method === "GET") {
          const count = [...clients].filter((c) => c.userId === user.id).length;
          if (count >= 10)
            throw new ApiError(429, "Слишком много подключений.");
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
          });
          res.write(
            `event: revision\ndata: ${store.workspace(user.id).revision}\n\n`,
          );
          const client = {
            userId: user.id,
            res,
            session: cookies[sessionName],
          };
          clients.add(client);
          const heartbeat = setInterval(() => {
            if (!store.authenticate(client.session) || !allowed(client.userId))
              res.end();
            else res.write(": heartbeat\n\n");
          }, 25000);
          res.on("close", () => {
            clearInterval(heartbeat);
            clients.delete(client);
          });
          return;
        }
        throw new ApiError(404, "Адрес не найден.");
      }
      if (!["GET", "HEAD"].includes(req.method))
        throw new ApiError(405, "Метод не поддерживается.");
      const name = decodeURIComponent(pathname),
        file = path.resolve(dist, `.${name === "/" ? "/index.html" : name}`);
      if (
        !file.startsWith(path.resolve(dist) + path.sep) ||
        name.split("/").some((p) => p.startsWith(".")) ||
        !/\.(html|js|css|svg|png|jpg|jpeg|webp|gif|woff2?|txt)$/.test(file)
      )
        throw new ApiError(404, "Файл не найден.");
      let content = await readFile(file);
      const ext = path.extname(file);
      if (ext === ".html")
        content = content
          .toString()
          .replace(
            /(<meta name="todo-api-url" content=")[^"]*("\s*\/?\s*>)/,
            "$1/api/workspace$2",
          );
      if (ext === ".js" || ext === ".css")
        res.setHeader(
          "Cache-Control",
          name === "/sw.js" ? "no-cache" : "public, max-age=604800, immutable",
        );
      const mime = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".txt": "text/plain; charset=utf-8",
      };
      res.writeHead(200, {
        "Content-Type": mime[ext] || "application/octet-stream",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      if (res.headersSent) {
        res.end();
        return;
      }
      json(res, error.status || (error.code === "ENOENT" ? 404 : 500), {
        error: translate(
          error.status
            ? error.message
            : error.code === "ENOENT"
              ? "Файл не найден."
              : "Внутренняя ошибка сервера.",
          req.headers["accept-language"]?.startsWith("en") ? "en" : "ru",
        ),
      });
    }
  });
  const cleanup = setInterval(() => store.cleanup(), 60000);
  cleanup.unref();
  return {
    server,
    notify,
    close: () => {
      clearInterval(cleanup);
      for (const c of clients) c.res.end();
      return new Promise((resolve) => {
        server.close(resolve);
        server.closeIdleConnections();
      });
    },
  };
}
