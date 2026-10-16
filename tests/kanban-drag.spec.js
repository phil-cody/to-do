import { test, expect } from "./fixtures/workspace.js";

for (const pointer of ["mouse", "touch"]) {
  test.describe(pointer, () => {
    test.use({
      hasTouch: pointer === "touch",
      viewport: { width: 1440, height: 1100 },
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
