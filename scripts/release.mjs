import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const archiveName = "todo-server.tgz";
function run(command, args, cwd = root, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Команда ${command} завершилась с ошибкой. Релиз не продолжен.`,
    );
}
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
export function inspectRelease(folder, expected) {
  if (!/^[a-f0-9]{40}$/.test(expected))
    throw new Error("Некорректный коммит релиза.");
  const archive = path.join(folder, archiveName);
  if (!existsSync(archive))
    throw new Error(
      "Для текущего коммита нет архива. Сначала выполните npm run release:prepare.",
    );
  const digest = createHash("sha256")
    .update(readFileSync(archive))
    .digest("hex");
  const checksum = readFileSync(archive + ".sha256", "utf8");
  if (checksum.trim() !== `${digest}  ${archiveName}`)
    throw new Error(
      "Контрольная сумма архива не совпадает. Подготовьте релиз заново.",
    );
  const revision = execFileSync("tar", ["-xOf", archive, "REVISION"], {
    encoding: "utf8",
  }).trim();
  if (revision !== expected)
    throw new Error("Архив содержит другой коммит. Подготовьте релиз заново.");
  const runtime = mkdtempSync(path.join(tmpdir(), "todo-release-check-"));
  try {
    execFileSync("tar", ["-xf", archive, "-C", runtime]);
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'await import("./server/app.js"); await import("./server/telegram.js");',
      ],
      { cwd: runtime, stdio: "pipe" },
    );
  } catch {
    throw new Error(
      "Серверные модули из архива не загружаются. Проверьте состав релиза и выполните release:prepare заново.",
    );
  } finally {
    rmSync(runtime, { recursive: true, force: true });
  }
}
function revision() {
  if (git("status", "--porcelain"))
    throw new Error(
      "Есть незакоммиченные изменения. Сначала сохраните их в Git и выполните push.",
    );
  run("git", ["fetch", "origin", "main"]);
  const current = git("rev-parse", "HEAD");
  if (current !== git("rev-parse", "origin/main"))
    throw new Error(
      "HEAD не совпадает с origin/main. Сначала завершите push/синхронизацию Git.",
    );
  return current;
}
function prepare(sha, folder) {
  if (Number(process.versions.node.split(".")[0]) !== 24)
    throw new Error("Для подготовки релиза используйте Node.js 24.");
  const temporary = mkdtempSync(path.join(tmpdir(), "todo-release-"));
  try {
    const source = path.join(temporary, "source.tar");
    run("git", ["archive", "--format=tar", "-o", source, sha]);
    run("tar", ["-xf", source, "-C", temporary]);
    rmSync(source);
    run("npm", ["ci", "--no-audit", "--no-fund"], temporary);
    run("npm", ["run", "build"], temporary);
    writeFileSync(path.join(temporary, "REVISION"), sha + "\n");
    const archive = path.join(temporary, archiveName);
    run(
      "tar",
      [
        "--no-xattrs",
        "-czf",
        archive,
        "package.json",
        "package-lock.json",
        "server",
        "src/app/attachments.js",
        "src/app/sync/client-store.js",
        "src/app/model.js",
        "src/app/description.js",
        "src/app/i18n.js",
        "src/app/i18n-messages.js",
        "dist",
        "deploy",
        "REVISION",
      ],
      temporary,
      { COPYFILE_DISABLE: "1" },
    );
    mkdirSync(folder, { recursive: true });
    const pendingArchive = path.join(
      folder,
      `${archiveName}.next-${process.pid}`,
    );
    copyFileSync(archive, pendingArchive);
    renameSync(pendingArchive, path.join(folder, archiveName));
    copyFileSync(
      path.join(temporary, "deploy/update.sh"),
      path.join(folder, "update.sh"),
    );
    const digest = createHash("sha256")
      .update(readFileSync(path.join(folder, archiveName)))
      .digest("hex");
    writeFileSync(
      path.join(folder, archiveName + ".sha256"),
      `${digest}  ${archiveName}\n`,
    );
    inspectRelease(folder, sha);
    console.log(
      `\nРелиз подготовлен: ${sha}\nКаталог: ${folder}\nДалее: npm run release:upload`,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
export function main() {
  const [mode, host = "todo-vps"] = process.argv.slice(2);
  if (!["prepare", "upload", "install"].includes(mode))
    throw new Error(
      "Используйте release:prepare, release:upload или release:install.",
    );
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.@-]*$/.test(host))
    throw new Error(
      "Укажите SSH-псевдоним или user@host без дополнительных параметров.",
    );
  const sha = revision();
  const folder = path.join(root, ".cache", "releases", sha);
  if (mode === "prepare") return prepare(sha, folder);
  inspectRelease(folder, sha);
  const remote = `/tmp/todo-release-${sha}`;
  if (mode === "upload") {
    run("ssh", [host, `mkdir -p ${remote}`]);
    run("scp", [
      path.join(folder, archiveName),
      path.join(folder, archiveName + ".sha256"),
      path.join(folder, "update.sh"),
      `${host}:${remote}/`,
    ]);
    console.log(
      `Передан релиз ${sha}.\nДля обновления существующего приложения: npm run release:install${host === "todo-vps" ? "" : ` -- ${host}`}`,
    );
  } else {
    console.log(
      `Установка коммита ${sha} на ${host}. Потребуется пароль sudo пользователя VPS.`,
    );
    run("ssh", ["-t", host, `bash ${remote}/update.sh ${remote} ${sha}`]);
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
