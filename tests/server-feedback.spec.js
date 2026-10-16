import { test, expect } from "@playwright/test";
import { base, login } from "./fixtures/remote.js";
import { seed } from "./fixtures/workspace.js";
import { normalize } from "../src/app/model.js";
test.describe.configure({ mode: "parallel" });

async function prepare(page, request, user) {
  await login(page, user, request);
  const current = await (
    await page.request.get(base + "/api/workspace")
  ).json();
  const snapshot = normalize(seed);
  snapshot.projects[0].project_id = current.snapshot.projects.find(
    (project) => project.project_type === "inbox",
  ).project_id;
  const response = await page.request.put(base + "/api/workspace", {
    headers: {
      Origin: base,
      "If-Match": `"${current.revision}"`,
      "X-Operation-ID": crypto.randomUUID(),
      "X-Account-ID": String(user),
    },
    data: snapshot,
  });
  expect(response.ok(), `${response.status()}: ${await response.text()}`).toBe(
    true,
  );
  await page.reload();
  await page
    .locator("aside")
    .getByRole("button", { name: "Work", exact: true })
    .press("Enter");
  await expect(page.locator(".dashboard-heading h1")).toHaveText("Work");
  await expect(page.locator(".workspace")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  return (await response.json()).snapshot;
}

async function hold(page, rejected, path = "/api/workspace", method = "PUT") {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== method) return route.continue();
    writes++;
    await gate;
    if (rejected)
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test save rejected" }),
      });
    return route.continue();
  });
  return { release, writes: () => writes };
}

const inline = [
  "status",
  "priority",
  "pin",
  "view",
  "filter",
  "delete task",
  "delete project",
  "move project",
];
for (const [index, operation] of inline.entries())
  for (const rejected of [false, true]) {
    test(`${operation}: immediate display, pending indicator and ${rejected ? "rollback" : "confirmation"}`, async ({
      page,
      request,
    }) => {
      const before = await prepare(
        page,
        request,
        13000 + index * 2 + Number(rejected),
      );
      const inboxId = before.projects.find(
        (project) => project.project_type === "inbox",
      ).project_id;
      page.on("dialog", (dialog) => dialog.accept());
      if (operation === "move project")
        await page
          .getByRole("button", { name: "Show more", exact: true })
          .click();
      const gate = await hold(page, rejected);
      const card = page.locator("main .task-card");
      const check = async (changed) => {
        if (operation === "status")
          await expect(card.getByLabel("Status", { exact: true })).toHaveValue(
            changed ? "completed" : "pending",
          );
        if (operation === "priority")
          await expect(
            card.getByLabel("Priority", { exact: true }),
          ).toHaveValue(changed ? "low" : "high");
        if (operation === "pin")
          await expect(
            page.locator("aside").getByRole("button", {
              name: changed ? "Unpin Work" : "Pin Work",
              exact: true,
            }),
          ).toBeVisible();
        if (operation === "view")
          await expect(
            page.getByRole("button", { name: "List", exact: true }),
          ).toHaveAttribute("aria-pressed", String(changed));
        if (operation === "filter")
          await expect(page.getByLabel("Filter", { exact: true })).toHaveValue(
            changed ? "status-completed" : "all",
          );
        if (operation === "delete task")
          await expect(card).toHaveCount(changed ? 0 : 1);
        if (operation === "delete project")
          await expect(
            page
              .locator("aside")
              .getByRole("button", { name: "Work", exact: true }),
          ).toHaveCount(changed ? 0 : 1);
        if (operation === "move project")
          await expect(
            page.getByRole("dialog").getByLabel("Project", { exact: true }),
          ).toHaveValue(changed ? inboxId : "work");
      };
      try {
        if (operation === "status")
          await card
            .getByLabel("Status", { exact: true })
            .selectOption("completed");
        if (operation === "priority")
          await card
            .getByLabel("Priority", { exact: true })
            .selectOption("low");
        if (operation === "pin")
          await page
            .locator("aside")
            .getByRole("button", { name: "Pin Work", exact: true })
            .click();
        if (operation === "view")
          await page.getByRole("button", { name: "List", exact: true }).click();
        if (operation === "filter")
          await page
            .getByLabel("Filter", { exact: true })
            .selectOption("status-completed");
        if (operation === "delete task")
          await card
            .getByRole("button", { name: "Delete", exact: true })
            .click();
        if (operation === "delete project")
          await page
            .locator("aside .project-nav")
            .filter({
              has: page.getByRole("button", { name: "Work", exact: true }),
            })
            .getByRole("button", { name: "Delete", exact: true })
            .click();
        if (operation === "move project")
          await page
            .getByRole("dialog")
            .getByLabel("Project", { exact: true })
            .selectOption(inboxId);
        await check(true);
        await expect(
          page.getByRole("status").filter({ hasText: "Saving…" }),
        ).toBeVisible();
        await expect(page.locator(".workspace")).toHaveAttribute(
          "aria-busy",
          "true",
        );
        await expect(
          page.getByRole("button", { name: "+ Add Task", exact: true }),
        ).toBeDisabled();
        await expect.poll(gate.writes).toBe(1);
        gate.release();
        await expect(page.locator(".workspace")).toHaveAttribute(
          "aria-busy",
          "false",
        );
        await check(!rejected);
        if (rejected)
          await expect(
            page
              .getByRole("alert")
              .filter({ hasText: "Changes could not be saved:" }),
          ).toContainText("Test save rejected");
        expect(gate.writes()).toBe(1);
        const remote = await (
          await page.request.get(base + "/api/workspace")
        ).json();
        if (rejected) expect(remote.snapshot).toEqual(before);
      } finally {
        gate.release();
      }
    });
  }

const forms = [
  "new task",
  "new project",
  "edit task",
  "edit project",
  "import",
];
for (const [index, operation] of forms.entries())
  for (const rejected of [false, true]) {
    test(`${operation}: preserves its draft while saving and ${rejected ? "on rejection" : "closes on success"}`, async ({
      page,
      request,
    }) => {
      await prepare(page, request, 13100 + index * 2 + Number(rejected));
      if (operation === "new task")
        await page
          .getByRole("button", { name: "+ Add Task", exact: true })
          .click();
      if (operation === "new project")
        await page
          .getByRole("button", { name: "+ Add Project", exact: true })
          .click();
      if (operation === "edit task")
        await page
          .locator("main .task-card")
          .getByRole("button", { name: "Edit", exact: true })
          .click();
      if (operation === "edit project")
        await page
          .locator("aside .project-nav")
          .filter({
            has: page.getByRole("button", { name: "Work", exact: true }),
          })
          .getByRole("button", { name: "Edit", exact: true })
          .click();
      if (operation === "import") {
        await page
          .getByRole("button", {
            name: "Import projects and tasks",
            exact: true,
          })
          .click();
        await page
          .getByRole("dialog")
          .locator('input[type="file"]')
          .setInputFiles({
            name: "project.json",
            mimeType: "application/json",
            buffer: Buffer.from(
              JSON.stringify({
                format: "just-to-do-it/project",
                version: 1,
                project: {
                  title: "Imported",
                  tasks: [{ title: "Imported task" }],
                },
              }),
            ),
          });
        await expect(page.getByLabel("Import preview")).toBeVisible();
      } else
        await page
          .getByRole("dialog")
          .getByLabel("Title", { exact: true })
          .fill("Changed title");
      const gate = await hold(page, rejected);
      const dialog = page.getByRole("dialog");
      try {
        await dialog
          .getByRole("button", {
            name:
              operation === "import"
                ? "Add projects and tasks"
                : operation.includes("task")
                  ? "Save task"
                  : "Save project",
            exact: true,
          })
          .click();
        await expect(dialog.getByRole("status")).toHaveText("Saving…");
        await expect(
          dialog.getByRole("button", { name: "Close dialog" }),
        ).toBeDisabled();
        if (operation !== "import")
          await expect(
            dialog.getByLabel("Title", { exact: true }),
          ).toBeDisabled();
        await expect.poll(gate.writes).toBe(1);
        gate.release();
        await expect(page.locator(".workspace")).toHaveAttribute(
          "aria-busy",
          "false",
        );
        if (rejected) {
          await expect(dialog).toBeVisible();
          await expect(dialog.getByRole("alert")).toContainText(
            "Test save rejected",
          );
          if (operation === "import")
            await expect(page.getByLabel("Import preview")).toBeVisible();
          else {
            await expect(
              dialog.getByLabel("Title", { exact: true }),
            ).toHaveValue("Changed title");
            await expect(
              dialog.getByLabel("Title", { exact: true }),
            ).toBeEnabled();
          }
        } else await expect(dialog).toHaveCount(0);
        expect(gate.writes()).toBe(1);
      } finally {
        gate.release();
      }
    });
  }

for (const rejected of [false, true]) {
  test(`schedule: locks the draft while saving and ${rejected ? "keeps it on failure" : "confirms success"}`, async ({
    page,
    request,
  }) => {
    await prepare(page, request, rejected ? 13201 : 13200);
    await page.getByRole("button", { name: "Telegram and account" }).click();
    await page.getByLabel("Time", { exact: true }).fill("10:15");
    const gate = await hold(page, rejected, "/api/settings");
    try {
      await page
        .getByRole("button", { name: "Save schedule", exact: true })
        .click();
      await expect(page.getByLabel("Time", { exact: true })).toBeDisabled();
      await expect(
        page.getByRole("status").filter({ hasText: "Saving…" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Log out", exact: true }),
      ).toBeDisabled();
      await expect.poll(gate.writes).toBe(1);
      gate.release();
      await expect(page.getByLabel("Time", { exact: true })).toBeEnabled();
      await expect(page.getByLabel("Time", { exact: true })).toHaveValue(
        "10:15",
      );
      if (rejected)
        await expect(page.getByRole("alert")).toContainText(
          "Test save rejected",
        );
      else await expect(page.getByRole("status")).toHaveText("Schedule saved.");
    } finally {
      gate.release();
    }
  });
}

for (const [index, operation] of [
  "load settings",
  "language",
  "refresh",
  "logout",
].entries())
  for (const rejected of [false, true]) {
    test(`account ${operation}: visible pending state and ${rejected ? "failure" : "success"}`, async ({
      page,
      request,
    }) => {
      await prepare(page, request, 13300 + index * 2 + Number(rejected));
      if (["language", "logout"].includes(operation)) {
        await page
          .getByRole("button", { name: "Telegram and account" })
          .click();
        await expect(
          page.getByLabel("Time zone", { exact: true }),
        ).toBeVisible();
      }
      const path = {
        "load settings": "/api/me",
        language: "/api/settings",
        refresh: "/api/workspace",
        logout: "/api/auth/logout",
      }[operation];
      const method =
        operation === "language"
          ? "PUT"
          : operation === "logout"
            ? "POST"
            : "GET";
      const gate = await hold(page, rejected, path, method);
      try {
        if (operation === "load settings")
          await page
            .getByRole("button", { name: "Telegram and account" })
            .click();
        if (operation === "language")
          await page.getByLabel("Language", { exact: true }).selectOption("ru");
        if (operation === "refresh")
          await page
            .getByRole("button", { name: "Refresh", exact: true })
            .click();
        if (operation === "logout")
          await page
            .getByRole("button", { name: "Log out", exact: true })
            .click();
        await expect(page.locator(".save-feedback")).toHaveText(
          operation === "language" ? "Saving…" : "Please wait…",
        );
        await expect(
          page.getByRole("button", { name: "+ Add Task", exact: true }),
        ).toBeDisabled();
        await expect.poll(gate.writes).toBe(1);
        gate.release();
        if (!rejected && operation === "logout")
          await expect(
            page.getByRole("button", { name: "Sign in", exact: true }),
          ).toBeVisible();
        else {
          await expect(page.locator(".workspace")).toHaveAttribute(
            "aria-busy",
            "false",
          );
          if (rejected) {
            await expect(
              page
                .getByRole("alert")
                .filter({ hasText: "Test save rejected" })
                .first(),
            ).toBeVisible();
            await expect(
              page.getByRole("heading", { name: "Legacy task", exact: true }),
            ).toBeVisible();
          } else if (operation === "language") {
            await expect(page.getByRole("status")).toHaveText("Язык сохранён.");
            await expect(page.getByLabel("Язык", { exact: true })).toHaveValue(
              "ru",
            );
          } else if (operation === "load settings")
            await expect(
              page.getByLabel("Time zone", { exact: true }),
            ).toBeVisible();
        }
      } finally {
        gate.release();
      }
    });
  }

test("slow Telegram confirmation never starts overlapping polls and shows workspace loading", async ({
  page,
  request,
}) => {
  await page.goto(base);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.clock.install();
  let releaseAuth,
    releaseWorkspace,
    polls = 0;
  const authGate = new Promise((resolve) => {
    releaseAuth = resolve;
  });
  const workspaceGate = new Promise((resolve) => {
    releaseWorkspace = resolve;
  });
  await page.route("**/api/auth/complete", async (route) => {
    polls++;
    await authGate;
    await route.continue();
  });
  await page.route("**/api/workspace", async (route) => {
    await workspaceGate;
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const link = page.getByRole("link", {
      name: "Open Telegram and confirm sign-in",
    });
    const url = new URL(await link.getAttribute("href"));
    await request.post("http://localhost:4011", {
      data: { user: 13400, challenge: url.searchParams.get("start").slice(6) },
    });
    await page.clock.runFor(2000);
    await expect.poll(() => polls).toBe(1);
    await page.clock.runFor(8000);
    expect(polls).toBe(1);
    releaseAuth();
    await expect(page.getByRole("status")).toHaveText(
      "Loading your workspace…",
    );
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toHaveCount(0);
    releaseWorkspace();
    await expect(
      page.getByRole("heading", { name: "Inbox", exact: true }),
    ).toBeVisible();
    expect(polls).toBe(1);
  } finally {
    releaseAuth();
    releaseWorkspace();
  }
});

for (const mode of ["network", "server"]) {
  test(`${mode} failure preserves an inline edit across reload and synchronizes it after retry`, async ({
    page,
    request,
  }) => {
    await prepare(page, request, mode === "network" ? 13500 : 13501);
    let failing = true;
    await page.route("**/api/workspace", async (route) => {
      if (route.request().method() !== "PUT" || !failing)
        return route.continue();
      if (mode === "network") return route.abort("failed");
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary server outage" }),
      });
    });
    const priority = page
      .locator("main .task-card")
      .getByLabel("Priority", { exact: true });
    await priority.selectOption("low");
    await expect(priority).toHaveValue("low");
    await expect(page.locator(".workspace")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(page.locator(".sync-summary")).toContainText(
      "Pending uploads: 1",
    );
    const before = await (
      await page.request.get(base + "/api/workspace")
    ).json();
    expect(before.snapshot.projects[1].todoList[0].task_priority).toBe("high");
    await page.reload();
    await expect(priority).toHaveValue("low");
    failing = false;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.locator(".sync-summary")).toContainText("Synced");
    const after = await (
      await page.request.get(base + "/api/workspace")
    ).json();
    expect(after.snapshot.projects[1].todoList[0].task_priority).toBe("low");
    expect(after.snapshot.projects[1].todoList).toHaveLength(1);
  });
}
