import {
  copyFileSync,
  existsSync,
  rmSync,
  renameSync,
  chmodSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const [source, destination] = process.argv.slice(2);
if (
  !source ||
  !destination ||
  !existsSync(source) ||
  path.resolve(source) === path.resolve(destination)
)
  throw new Error("Нужны разные пути существующей копии и целевой базы.");
execFileSync(
  process.execPath,
  [fileURLToPath(new URL("./backup-check.mjs", import.meta.url)), source],
  { stdio: "inherit" },
);
const temporary = destination + ".restore";
if (existsSync(temporary))
  throw new Error("Временный файл восстановления уже существует.");
process.umask(0o077);
copyFileSync(source, temporary);
chmodSync(temporary, 0o600);
for (const suffix of ["-wal", "-shm"])
  rmSync(destination + suffix, { force: true });
renameSync(temporary, destination);
console.log("База восстановлена. Службу можно запустить.");
