import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { normalize } from "../src/app/model.js";
import { ApiError, validateSnapshot } from "./validation.js";
export const token = () => randomBytes(32).toString("base64url");
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export class Store {
  constructor(filename) {
    if (filename !== ":memory:") {
      mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    }
    this.db = new DatabaseSync(filename);
    if (filename !== ":memory:") chmodSync(filename, 0o600);
    if (this.db.prepare("PRAGMA user_version").get().user_version > 1) {
      this.db.close();
      throw new Error("Unsupported database schema");
    }
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, chat_id TEXT, settings TEXT NOT NULL DEFAULT '{"enabled":false,"time":"09:00","timezone":"UTC"}');
      CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY REFERENCES users(id), revision INTEGER NOT NULL, snapshot TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY,binding TEXT NOT NULL,expires INTEGER NOT NULL,user_id TEXT,approved INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS operations(user_id TEXT NOT NULL,id TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(user_id,id));
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS updates(id TEXT PRIMARY KEY,created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,chat_id TEXT NOT NULL,payload TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,available INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS digests(user_id TEXT NOT NULL,day TEXT NOT NULL,PRIMARY KEY(user_id,day));
      PRAGMA user_version=1;`);
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  user(id) {
    return this.db.prepare("SELECT * FROM users WHERE id=?").get(String(id));
  }
  setSettings(id, settings) {
    this.db
      .prepare("UPDATE users SET settings=? WHERE id=?")
      .run(JSON.stringify(settings), id);
    if (!settings.enabled)
      this.db
        .prepare("DELETE FROM outbox WHERE chat_id=? AND id LIKE ?")
        .run(id, `digest:${id}:%`);
  }
  ensureUser(from, chatId) {
    const id = String(from.id),
      name = String(from.first_name || from.username || "Telegram").slice(
        0,
        100,
      );
    this.db
      .prepare(
        "INSERT INTO users(id,name,chat_id) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,chat_id=excluded.chat_id",
      )
      .run(id, name, String(chatId));
    if (!this.db.prepare("SELECT 1 FROM workspaces WHERE user_id=?").get(id))
      this.db
        .prepare("INSERT INTO workspaces VALUES(?,1,?)")
        .run(id, JSON.stringify(normalize({ projects: [] })));
    return id;
  }
  workspace(id) {
    const row = this.db
      .prepare("SELECT revision,snapshot FROM workspaces WHERE user_id=?")
      .get(id);
    return { revision: row.revision, snapshot: JSON.parse(row.snapshot) };
  }
  save(id, snapshot, revision, operationId) {
    return this.transaction(() => {
      if (
        this.db
          .prepare("SELECT 1 FROM operations WHERE user_id=? AND id=?")
          .get(id, operationId)
      )
        return this.workspace(id);
      const current = this.workspace(id);
      if (current.revision !== revision)
        throw new ApiError(409, "Данные изменились на другом устройстве.");
      const next = validateSnapshot(snapshot);
      const inbox = current.snapshot.projects.find(
        (p) => p.project_type === "inbox",
      );
      if (
        inbox &&
        !next.projects.some(
          (p) =>
            p.project_id === inbox.project_id && p.project_type === "inbox",
        )
      )
        throw new ApiError(422, "Inbox нельзя удалить или заменить.");
      this.db
        .prepare(
          "UPDATE workspaces SET revision=revision+1,snapshot=? WHERE user_id=?",
        )
        .run(JSON.stringify(next), id);
      this.db
        .prepare("INSERT INTO operations VALUES(?,?,?)")
        .run(id, operationId, Date.now());
      return this.workspace(id);
    });
  }
  session(id) {
    const secret = token();
    this.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(hash(secret), id, Date.now() + 30 * 86400000);
    return secret;
  }
  authenticate(secret) {
    if (!secret) return null;
    return (
      this.db
        .prepare(
          "SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires>?",
        )
        .get(hash(secret), Date.now()) || null
    );
  }
  revoke(secret) {
    if (secret)
      this.db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(secret));
  }
  challenge() {
    const id = token(),
      binding = token();
    this.db
      .prepare("INSERT INTO challenges(id,binding,expires) VALUES(?,?,?)")
      .run(id, hash(binding), Date.now() + 300000);
    return { id, binding };
  }
  getChallenge(id, binding) {
    return this.db
      .prepare(
        "SELECT * FROM challenges WHERE id=? AND binding=? AND expires>?",
      )
      .get(id, hash(binding || ""), Date.now());
  }
  cleanup() {
    const now = Date.now();
    this.db.prepare("DELETE FROM sessions WHERE expires<?").run(now);
    this.db
      .prepare("DELETE FROM challenges WHERE expires<?")
      .run(now); /* Operation/update IDs are retained to prevent replay. */
  }
  enqueue(id, chatId, text, extra = {}) {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO outbox(id,chat_id,payload,available) VALUES(?,?,?,?)",
      )
      .run(id, String(chatId), JSON.stringify({ text, ...extra }), Date.now());
  }
  addInbox(id, text, messageId) {
    const { snapshot } = this.workspace(id);
    let inbox = snapshot.projects.find((p) => p.project_type === "inbox");
    if (!inbox) {
      inbox = normalize({ projects: [] }).projects[0];
      snapshot.projects.push(inbox);
    }
    const lines = text.trim().split("\n");
    const title = lines[0].slice(0, 200);
    inbox.todoList.push({
      task_id: randomUUID(),
      task_project: inbox.project_id,
      task_title: title,
      task_description:
        lines.length > 1
          ? lines.slice(1).join("\n")
          : text.trim().length > 200
            ? text.trim()
            : "",
      task_due_date: "",
      task_status: "pending",
      task_priority: "low",
      task_createdAt: new Date().toISOString(),
    });
    const validated = validateSnapshot(snapshot);
    this.db
      .prepare(
        "UPDATE workspaces SET revision=revision+1,snapshot=? WHERE user_id=?",
      )
      .run(JSON.stringify(validated), id);
    this.enqueue(`task:${messageId}`, id, `Добавлено в Inbox: ${title}`);
  }
  close() {
    this.db.close();
  }
}
