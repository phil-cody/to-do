import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Store } from "../server/store.js";
import { DatabaseSync } from "node:sqlite";
test("SQLite backup includes live WAL changes and restores a consistent database", () => {
  const folder = mkdtempSync(path.join(tmpdir(), "todo-backup-test-")),
    source = path.join(folder, "source.sqlite"),
    backup = path.join(folder, "copy.sqlite"),
    restored = path.join(folder, "restored.sqlite");
  const store = new Store(source);
  try {
    store.ensureUser({ id: 11 }, 11);
    store.addInbox("11", "Task committed to WAL", "backup-test");
    execFileSync(process.execPath, ["deploy/backup.mjs", source, backup]);
    assert.ok(existsSync(backup));
    execFileSync(process.execPath, ["deploy/backup-check.mjs", backup]);
    execFileSync(process.execPath, ["deploy/restore.mjs", backup, restored]);
    const db = new DatabaseSync(restored, { readOnly: true });
    try {
      assert.equal(
        JSON.parse(db.prepare("SELECT snapshot FROM workspaces").get().snapshot)
          .projects[0].todoList[0].task_title,
        "Task committed to WAL",
      );
    } finally {
      db.close();
    }
  } finally {
    store.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
