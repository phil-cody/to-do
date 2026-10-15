import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { inspectRelease } from "../scripts/release.mjs";

test("release builds the pushed commit and refuses stale, corrupt, dirty or unpushed versions", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "todo-release-test-"));
  const root = path.join(temporary, "repo"),
    remote = path.join(temporary, "origin.git");
  mkdirSync(root);
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    for (const folder of ["scripts", "deploy", "server", "src/app"])
      mkdirSync(path.join(root, folder), { recursive: true });
    copyFileSync("scripts/release.mjs", path.join(root, "scripts/release.mjs"));
    copyFileSync("deploy/update.sh", path.join(root, "deploy/update.sh"));
    const pkg = {
      name: "release-test",
      version: "1.0.0",
      scripts: {
        build: `node -e "const f=require('fs'); f.mkdirSync('dist'); f.writeFileSync('dist/index.html','Content-Security-Policy'); f.writeFileSync('dist/sw.js','// fixture');"`,
      },
    };
    writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg));
    writeFileSync(
      path.join(root, "package-lock.json"),
      JSON.stringify({
        name: pkg.name,
        version: pkg.version,
        lockfileVersion: 3,
        packages: { "": { name: pkg.name, version: pkg.version } },
      }),
    );
    writeFileSync(path.join(root, ".gitignore"), ".cache/\nnode_modules/\n");
    for (const name of [
      "server/index.js",
      "src/app/model.js",
      "src/app/description.js",
      "src/app/i18n.js",
      "src/app/i18n-messages.js",
    ])
      writeFileSync(path.join(root, name), "// synthetic fixture\n");
    git("init", "-b", "main");
    git("config", "user.name", "Release Test");
    git("config", "user.email", "release-test@example.invalid");
    git("add", ".");
    git("commit", "-m", "Synthetic release");
    git("init", "--bare", remote);
    git("remote", "add", "origin", remote);
    git("push", "-u", "origin", "main");
    const sha = git("rev-parse", "HEAD");
    execFileSync(process.execPath, ["scripts/release.mjs", "prepare"], {
      cwd: root,
      stdio: "pipe",
    });
    const folder = path.join(root, ".cache/releases", sha);
    inspectRelease(folder, sha);
    assert.throws(
      () => inspectRelease(folder, "0".repeat(40)),
      /другой коммит/,
    );
    const archive = path.join(folder, "todo-server.tgz");
    const original = readFileSync(archive);
    writeFileSync(
      archive,
      Buffer.concat([original, Buffer.from("corruption")]),
    );
    assert.throws(() => inspectRelease(folder, sha), /сумма/);
    writeFileSync(archive, original);
    writeFileSync(
      path.join(root, "server/index.js"),
      "// uncommitted change\n",
    );
    let attempt = spawnSync(
      process.execPath,
      ["scripts/release.mjs", "upload"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(attempt.status, 1);
    assert.match(attempt.stderr, /незакоммиченные/);
    git("add", "server/index.js");
    git("commit", "-m", "Not pushed");
    attempt = spawnSync(process.execPath, ["scripts/release.mjs", "install"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(attempt.status, 1);
    assert.match(attempt.stderr, /HEAD не совпадает/);
    git("push", "origin", "main");
    attempt = spawnSync(process.execPath, ["scripts/release.mjs", "upload"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(attempt.status, 1);
    assert.match(attempt.stderr, /нет архива/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
