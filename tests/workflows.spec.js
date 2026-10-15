import { test, expect } from "./fixtures/workspace.js";

test("plus, markdown detail, editing, movement, kanban, persistence, dashboard", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator(".plus").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("New task");
  await page
    .getByRole("dialog")
    .getByLabel("Description · Markdown")
    .fill("**Markdown task**");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "New task", exact: true }),
  ).toBeVisible();
  await page
    .locator(".task-card")
    .filter({ has: page.getByRole("heading", { name: "Legacy task" }) })
    .getByRole("button", { name: "Show more" })
    .click();
  await expect(page.getByRole("dialog").locator("strong")).toHaveText(
    "Bold notes",
  );
  await page
    .getByRole("dialog")
    .getByLabel("Project", { exact: true })
    .selectOption("inbox");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit task", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Moved task");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("button", { name: "All tasks & projects" }).click();
  await expect(
    page.getByRole("heading", { name: "Moved task", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(page.locator(".kanban-column")).toHaveCount(4);
  await page
    .locator(".task-card")
    .filter({ has: page.getByRole("heading", { name: "Moved task" }) })
    .getByLabel("Status", { exact: true })
    .selectOption("completed");
  await expect(page.locator(".column-completed")).toContainText("Moved task");
  await page.reload();
  await expect(page.locator(".column-completed")).toContainText("Moved task");
  await page.getByRole("button", { name: "▦ Project dashboard" }).click();
  await expect(page.getByRole("dialog").locator(".project-card")).toHaveCount(
    2,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Pin Work", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Unpin Work", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(
    page
      .locator("aside")
      .getByRole("button", { name: "Unpin Work", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("project CRUD, cancel, delete task", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "+ Add Project", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Personal");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Personal", exact: true }),
  ).toBeVisible();
  await page
    .locator(".project-nav.active")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Personal updated");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Personal updated" }),
  ).toBeVisible();
  await page.locator(".plus").click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  page.on("dialog", (d) => d.accept());
  await page
    .locator(".project-nav.active")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator("aside")).not.toContainText("Personal updated");
  await page.getByRole("button", { name: "Show more" }).click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Legacy task" })).toHaveCount(
    0,
  );
});
test("search, filters, drag between columns and sanitized markdown", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Search tasks").fill("missing");
  await expect(page.getByText("No tasks match your filters.")).toBeVisible();
  await page.getByLabel("Search tasks").fill("Legacy");
  await page
    .getByLabel("Filter", { exact: true })
    .selectOption("status-completed");
  await expect(page.getByRole("heading", { name: "Legacy task" })).toHaveCount(
    0,
  );
  await page.getByLabel("Filter", { exact: true }).selectOption("all");
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await page.locator(".task-card").dragTo(page.locator(".column-in-process"));
  await expect(page.locator(".column-in-process")).toContainText("Legacy task");
  await page
    .locator(".task-card")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByLabel("Description · Markdown")
    .fill(
      '**Safe** <img src="x" onerror="window.xss=true" /> <script>window.xss=true</script>',
    );
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(page.getByRole("dialog").locator("strong")).toHaveText("Safe");
  expect(await page.evaluate(() => window.xss)).toBeUndefined();
  await expect(
    page.getByRole("dialog").locator("script, [onerror]"),
  ).toHaveCount(0);
});

test("markdown cards, pinned ordering and four exclusive kanban columns", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-14T10:00:00Z") });
  await page.goto("/");
  await page
    .locator(".view-segment")
    .getByRole("button", { name: "List", exact: true })
    .click();
  await expect(page.locator(".task-excerpt h2")).toHaveText("Details");
  await expect(page.locator(".task-excerpt strong")).toHaveText("Bold notes");
  await page
    .locator("aside")
    .getByRole("button", { name: "Pin Work", exact: true })
    .click();
  await expect(
    page
      .locator("aside .project-group")
      .first()
      .locator(".project-nav .nav-item"),
  ).toHaveText(["Inbox", "Work"]);
  await page.reload();
  await expect(page.locator("aside .project-nav").first()).toContainText(
    "Inbox",
  );
  await page
    .locator("aside")
    .getByRole("button", { name: "Unpin Work", exact: true })
    .click();
  await expect(page.locator("aside .project-nav").first()).toContainText(
    "Inbox",
  );
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("todo_app")),
      p = state.projects.find((p) => p.project_id === "work");
    p.todoList = [
      ["done", "completed", "2000-01-01"],
      ["pending", "pending", "2026-10-14"],
      ["process", "in-process", "2026-10-30"],
      ["late", "in-process", "2026-10-10"],
    ].map(([id, status, date]) => ({
      task_id: id,
      task_project: p.project_id,
      task_title: id,
      task_description: "**Description**",
      task_priority: "high",
      task_due_date: date,
      task_status: status,
    }));
    p.project_view = "list";
    localStorage.setItem("todo_app", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator(".task-card h3")).toHaveText([
    "late",
    "process",
    "pending",
    "done",
  ]);
  await page
    .locator(".task-card")
    .filter({
      has: page.getByRole("heading", { name: "process", exact: true }),
    })
    .getByLabel("Status", { exact: true })
    .selectOption("completed");
  await expect(page.locator(".task-card h3")).toHaveText([
    "late",
    "pending",
    "done",
    "process",
  ]);
  await page
    .locator(".view-segment")
    .getByRole("button", { name: "Kanban", exact: true })
    .click();
  await expect(page.locator(".kanban-column>h3")).toHaveText([
    "Overdue1",
    "Pending1",
    "Completed2",
    "In process0",
  ]);
  await expect(page.locator(".kanban .task-card")).toHaveCount(4);
  await expect(page.locator(".column-overdue")).toContainText("late");
  await page
    .locator(".column-overdue .task-card")
    .getByLabel("Status", { exact: true })
    .selectOption("completed");
  await expect(page.locator(".column-overdue .task-card")).toHaveCount(0);
  await expect(page.locator(".column-completed .task-card")).toHaveCount(3);
});

test.describe("calendar rollover", () => {
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });
  test("sorting and kanban update at midnight without a reload", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-14T16:59:50Z") });
    await page.goto("/");
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("todo_app")),
        p = state.projects.find((p) => p.project_id === "work");
      p.project_view = "kanban";
      p.todoList[0].task_due_date = "2026-10-14";
      localStorage.setItem("todo_app", JSON.stringify(state));
    });
    await page.reload();
    await expect(page.locator(".column-pending .task-card")).toHaveCount(1);
    await page.clock.runFor(11000);
    await expect(page.locator(".column-overdue .task-card")).toHaveCount(1);
    await expect(page.locator(".column-pending .task-card")).toHaveCount(0);
  });
});

test("old inline checklist renders immediately without changing the stored task", async ({
  page,
}) => {
  await page.goto("/");
  const description =
    "- Используя макет от Stitch стилизовать проект [x] - стилизовать десктопную версию [ ] - добавить адаптивное отображение для всех экранов";
  await page.evaluate((text) => {
    const data = JSON.parse(localStorage.getItem("todo_app")),
      p = data.projects.find((p) => p.project_id === "work");
    p.project_view = "list";
    p.todoList[0].task_description = text;
    localStorage.setItem("todo_app", JSON.stringify(data));
  }, description);
  await page.reload();
  await expect(page.locator(".task-excerpt li")).toHaveCount(3);
  await expect(
    page.locator('.task-excerpt input[type="checkbox"]').nth(0),
  ).toBeChecked();
  await expect(
    page.locator('.task-excerpt input[type="checkbox"]').nth(1),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("todo_app")).projects.find(
          (p) => p.project_id === "work",
        ).todoList[0].task_description,
    ),
  ).toBe(description);
  await page.getByRole("button", { name: "Show more" }).click();
  await expect(page.getByRole("dialog").locator("li")).toHaveCount(3);
  await expect(
    page.getByRole("dialog").locator('input[type="checkbox"]').nth(0),
  ).toBeChecked();
});

test("project groups append pins, persist their order and show navigation above projects", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("todo_app"));
    data.projects.push({
      project_id: "personal",
      project_title: "Personal",
      project_priority: 3,
      project_pinned: false,
      todoList: [],
    });
    localStorage.setItem("todo_app", JSON.stringify(data));
  });
  await page.reload();
  const pinned = page.locator("aside .project-group").nth(0),
    other = page.locator("aside .project-group").nth(1);
  await expect(pinned.getByRole("heading")).toHaveText("Pinned projects");
  await expect(other.getByRole("heading")).toHaveText("Other projects");
  await page
    .locator("aside")
    .getByRole("button", { name: "Pin Work", exact: true })
    .click();
  await page
    .locator("aside")
    .getByRole("button", { name: "Pin Personal", exact: true })
    .click();
  await expect(pinned.locator(".project-nav .nav-item")).toHaveText([
    "Inbox",
    "Work",
    "Personal",
  ]);
  await expect(other.locator(".project-nav")).toHaveCount(0);
  await page.reload();
  await expect(pinned.locator(".project-nav .nav-item")).toHaveText([
    "Inbox",
    "Work",
    "Personal",
  ]);
  await page
    .locator("aside")
    .getByRole("button", { name: "Unpin Work", exact: true })
    .click();
  await expect(other.locator(".project-nav .nav-item")).toHaveText(["Work"]);
  await page
    .locator("aside")
    .getByRole("button", { name: "Pin Work", exact: true })
    .click();
  await expect(pinned.locator(".project-nav .nav-item")).toHaveText([
    "Inbox",
    "Personal",
    "Work",
  ]);
  expect(
    await page
      .locator("aside .workspace-links")
      .evaluate((e) => e.getBoundingClientRect().bottom),
  ).toBeLessThan(
    await page
      .locator("aside nav")
      .evaluate((e) => e.getBoundingClientRect().top),
  );
});

test("kanban accordion starts with empty columns collapsed at the end and resets on reentry", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-14T10:00:00Z") });
  await page.goto("/");
  await page
    .locator(".view-segment")
    .getByRole("button", { name: "Kanban", exact: true })
    .click();
  await expect(page.locator(".kanban-column>h3")).toHaveText([
    "Pending1",
    "Overdue0",
    "In process0",
    "Completed0",
  ]);
  const pending = page.locator(".column-pending"),
    completed = page.locator(".column-completed");
  await expect(
    pending.getByRole("button", { name: "Pending: 1 tasks" }),
  ).toHaveAttribute("aria-expanded", "true");
  for (const name of ["overdue", "in-process", "completed"])
    await expect(
      page.locator(`.column-${name} .column-toggle`),
    ).toHaveAttribute("aria-expanded", "false");
  await completed.getByRole("button").click();
  await expect(completed.locator(".kanban-content")).toBeVisible();
  await pending.getByRole("button", { name: "Pending: 1 tasks" }).click();
  await expect(pending.locator(".task-card")).not.toBeVisible();
  await pending
    .getByRole("button", { name: "Pending: 1 tasks" })
    .press("Enter");
  await expect(pending.locator(".task-card")).toBeVisible();
  await page
    .locator(".view-segment")
    .getByRole("button", { name: "List", exact: true })
    .click();
  await page
    .locator(".view-segment")
    .getByRole("button", { name: "Kanban", exact: true })
    .click();
  await expect(completed.locator(".column-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await pending.locator(".task-card").dragTo(completed);
  await expect(completed.locator(".task-card")).toBeVisible();
  await expect(completed.locator(".column-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator(".kanban-column").first()).toHaveClass(
    /column-completed/,
  );
  await expect(pending.locator(".column-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.screenshot({
    path: "test-results/kanban-accordion.png",
    fullPage: true,
  });
});

test("desktop kanban uses two columns and task details hide Created and style Due", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(page.locator(".kanban")).toBeVisible();
  expect(
    await page
      .locator(".kanban")
      .evaluate(
        (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(2);
  await page
    .locator(".task-card")
    .getByRole("button", { name: "Show more", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".detail-due time")).toBeVisible();
  await expect(dialog).not.toContainText("Created:");
});
