import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, chmodSync } from "node:fs";
const [source, destination] = process.argv.slice(2);
if (!source || !destination || !existsSync(source) || existsSync(destination))
  throw new Error("Укажите существующую базу и новый путь копии.");
process.umask(0o077);
const database = new DatabaseSync(source, { readOnly: true });
try {
  await backup(database, destination);
  chmodSync(destination, 0o600);
  console.log("Резервная копия создана.");
} finally {
  database.close();
}
