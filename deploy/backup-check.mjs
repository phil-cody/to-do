import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
const file = process.argv[2];
if (!file || !existsSync(file))
  throw new Error("Укажите существующий файл копии.");
const database = new DatabaseSync(file, { readOnly: true });
try {
  const check = database.prepare("PRAGMA integrity_check").all();
  if (check.some((row) => Object.values(row)[0] !== "ok"))
    throw new Error("Проверка целостности не пройдена.");
  if (
    !database
      .prepare("SELECT name FROM sqlite_master WHERE name='workspaces'")
      .get()
  )
    throw new Error("В копии нет таблицы рабочих областей.");
  console.log("Целостность копии подтверждена.");
} finally {
  database.close();
}
