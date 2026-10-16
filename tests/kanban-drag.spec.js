import { test, expect } from "./fixtures/workspace.js";

for (const part of [".column-label", ".column-count", "svg"]) {
  test(`desktop releases onto header ${part} even if pointer capture is lost`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/");
    await page.getByRole("button", { name: "Kanban", exact: true }).click();
    const handle = page.getByRole("button", {
      name: "Move Legacy task",
      exact: true,
    });
    for (let attempt = 0; attempt < 6; attempt++) {
      const status = attempt % 2 ? "pending" : "in-process";
      const source = await handle.boundingBox();
      const target = page.locator(`.column-${status} .column-toggle ${part}`);
      const end = await target.boundingBox();
      await handle.evaluate((element) =>
        element.addEventListener("gotpointercapture", (event) => {
          element.dataset.capturedPointer = event.pointerId;
        }),
      );
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
        steps: 5,
      });
      if (attempt % 2) {
        await expect(page.locator(`.column-${status}`)).toHaveClass(
          /is-drop-target/,
        );
        await handle.evaluate((element) =>
          element.releasePointerCapture(
            Number(element.dataset.capturedPointer),
          ),
        );
      }
      await page.mouse.up();
      await expect(page.locator(`.column-${status} .task-card`)).toContainText(
        "Legacy task",
      );
      await expect(page.locator(".kanban-drag-preview")).toHaveCount(0);
    }
  });
}

test("desktop drag holds an expanded destination near the bottom edge until release", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.addInitScript(() => {
    const data = JSON.parse(localStorage.getItem("todo_app"));
    const project = data.projects[1];
    project.project_view = "kanban";
    for (let i = 0; i < 8; i++)
      project.todoList.push({
        ...project.todoList[0],
        task_id: `extra-${i}`,
        task_title: `Z Extra ${i}`,
      });
    localStorage.setItem("todo_app", JSON.stringify(data));
  });
  await page.goto("/");
  const column = page.locator(".column-completed");
  await expect(page.locator(".task-excerpt strong")).toHaveCount(9);
  await page.evaluate(() => document.fonts.ready);
  await column.locator(".column-toggle").click();
  const handle = page.getByRole("button", {
    name: "Move Legacy task",
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  const source = await handle.boundingBox();
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    source.x + source.width / 2 + 15,
    source.y + source.height / 2,
  );
  await column.evaluate((element) => {
    const main = element.closest("main");
    main.scrollTop +=
      element.getBoundingClientRect().top -
      main.getBoundingClientRect().bottom +
      60;
  });
  const target = await column.locator(".column-toggle").boundingBox();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  await expect(column).toHaveClass(/is-drop-target/);
  const position = await page
    .locator("main")
    .evaluate((element) => element.scrollTop);
  await page.evaluate(async () => {
    for (let i = 0; i < 40; i++)
      await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  expect(
    await page.locator("main").evaluate((element) => element.scrollTop),
  ).toBe(position);
  await expect(column).toHaveClass(/is-drop-target/);
  await page.mouse.up();
  await expect(
    column.getByRole("heading", { name: "Legacy task", exact: true }),
  ).toBeVisible();
});

test("keyboard can move an overdue task only to completed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const data = JSON.parse(localStorage.getItem("todo_app"));
    data.projects[1].project_view = "kanban";
    data.projects[1].todoList[0].task_due_date = "2000-01-01";
    localStorage.setItem("todo_app", JSON.stringify(data));
  });
  await page.goto("/");
  const card = page.locator(".column-overdue .task-card");
  const handle = card.getByRole("button", {
    name: "Move Legacy task",
    exact: true,
  });
  await expect(handle).toBeEnabled();
  await handle.press("ArrowUp");
  await expect(page.locator(".column-completed .task-card")).toContainText(
    "Legacy task",
  );
});

for (const pointer of ["mouse", "touch"]) {
  test.describe(pointer, () => {
    test.use({
      hasTouch: pointer === "touch",
      viewport: { width: 1440, height: 1100 },
    });

    test("overdue task accepts only the completed destination", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const data = JSON.parse(localStorage.getItem("todo_app"));
        data.projects[1].project_view = "kanban";
        data.projects[1].todoList[0].task_due_date = "2000-01-01";
        localStorage.setItem("todo_app", JSON.stringify(data));
      });
      await page.goto("/");
      const client =
        pointer === "touch" ? await page.context().newCDPSession(page) : null;
      for (const status of ["in-process", "pending", "completed"]) {
        const handle = page.getByRole("button", {
          name: "Move Legacy task",
          exact: true,
        });
        await expect(handle).toBeEnabled();
        const source = await handle.boundingBox();
        const column = page.locator(`.column-${status}`);
        const target = await column.locator(".column-toggle").boundingBox();
        const start = {
          x: source.x + source.width / 2,
          y: source.y + source.height / 2,
        };
        const end = {
          x: target.x + target.width / 2,
          y: target.y + target.height / 2,
        };
        if (client) {
          await client.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [start],
          });
          await client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [end],
          });
        } else {
          await page.mouse.move(start.x, start.y);
          await page.mouse.down();
          await page.mouse.move(end.x, end.y, { steps: 5 });
        }
        if (status === "completed")
          await expect(column).toHaveClass(/is-drop-target/);
        else await expect(column).not.toHaveClass(/is-drop-target/);
        if (client)
          await client.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        else await page.mouse.up();
        await expect(
          page.locator(
            `.column-${status === "completed" ? "completed" : "overdue"} .task-card`,
          ),
        ).toContainText("Legacy task");
      }
      const task = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("todo_app")).projects[1].todoList[0],
      );
      expect(task.task_status).toBe("completed");
      expect(task.task_due_date).toBe("2000-01-01");
    });

    for (const scenario of [
      "title to collapsed",
      "handle to populated",
      "description to expanded empty",
      "card to row whitespace",
    ]) {
      const gesture =
        pointer === "touch"
          ? scenario.replace(/title|description|card/, "handle")
          : scenario;
      test(`kanban ${gesture}`, async ({ page }) => {
        await page.clock.setFixedTime(new Date("2026-10-14T10:00:00Z"));
        await page.addInitScript(
          (count) => {
            const data = JSON.parse(localStorage.getItem("todo_app"));
            const project = data.projects[1];
            if (project.todoList.length > 1) return;
            project.project_view = "kanban";
            for (let i = 0; i < count; i++)
              project.todoList.push({
                ...project.todoList[0],
                task_id: `active-${i}`,
                task_title: `Active ${i}`,
                task_status: "in-process",
              });
            localStorage.setItem("todo_app", JSON.stringify(data));
          },
          scenario === "card to row whitespace" ? 3 : 1,
        );
        await page.goto("/");
        const blank = scenario === "card to row whitespace";
        const title = blank ? "Active 0" : "Legacy task";
        const card = page.locator(".task-card").filter({
          has: page.getByRole("heading", { name: title, exact: true }),
        });
        await expect(card.getByLabel("Status", { exact: true })).toHaveCount(0);
        await expect(
          card.getByLabel("Priority", { exact: true }),
        ).toBeVisible();
        const status = blank
          ? "pending"
          : scenario === "handle to populated"
            ? "in-process"
            : "completed";
        const column = page.locator(`.column-${status}`);
        if (scenario === "description to expanded empty")
          await column.locator(".column-toggle").click();
        const source =
          pointer === "mouse" && scenario.startsWith("title")
            ? card.locator("h3")
            : pointer === "mouse" && scenario.startsWith("description")
              ? card.locator(".task-excerpt strong")
              : pointer === "mouse" && blank
                ? card
                : card.getByRole("button", {
                    name: `Move ${title}`,
                    exact: true,
                  });
        await source.scrollIntoViewIfNeeded();
        const box = await source.boundingBox();
        const start =
          pointer === "mouse" && blank
            ? { x: box.x + 5, y: box.y + 5 }
            : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const target = await column.boundingBox();
        const end = {
          x: target.x + target.width / 2,
          y: blank ? target.y + target.height + 20 : target.y + 30,
        };
        if (pointer === "touch") {
          const client = await page.context().newCDPSession(page);
          await client.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [start],
          });
          await client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [end],
          });
          await expect(column).toHaveClass(/is-drop-target/);
          await client.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        } else {
          await page.mouse.move(start.x, start.y);
          await page.mouse.down();
          await page.mouse.move(end.x, end.y, { steps: 8 });
          await expect(column).toHaveClass(/is-drop-target/);
          await page.mouse.up();
        }
        await expect(
          column.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
        await expect(page.locator(".kanban-drag-preview")).toHaveCount(0);
        await page.reload();
        await expect(
          column.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible();
      });
    }
  });
}
