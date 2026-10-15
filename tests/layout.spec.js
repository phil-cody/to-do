import { test, expect } from "./fixtures/workspace.js";

for (const width of [360, 768, 1440])
  test(`layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Work", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Kanban", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "+ Add Task", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Description · Markdown")
      .fill("# Notes");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/layout-${width}.png`,
      fullPage: true,
    });
  });
for (const width of [360, 398, 399, 600, 759, 760])
  test(`drawer and grid boundaries at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const mobile = width < 760;
    if (mobile) {
      const toggle = page.getByRole("button", { name: "Open project menu" });
      await expect(toggle).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: "Project navigation" }),
      ).not.toBeVisible();
      const top = await page
        .locator("main")
        .evaluate((e) => e.getBoundingClientRect().top);
      expect(top).toBeLessThan(170);
      await toggle.click();
      const drawer = page.getByRole("dialog", { name: "Project navigation" });
      await expect(drawer).toBeVisible();
      await drawer.evaluate((element) =>
        Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        ),
      );
      const boxes = await drawer
        .locator(".project-nav")
        .evaluateAll((elements) =>
          elements.map((e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y };
          }),
        );
      expect(boxes[0].x).toBe(boxes[1].x);
      expect(boxes[0].y).toBeLessThan(boxes[1].y);
      if (width === 360)
        await page.screenshot({
          path: "test-results/drawer-open-360.png",
          fullPage: true,
        });
      await page.keyboard.press("Escape");
      await expect(drawer).not.toBeVisible();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await drawer.locator(".nav-item").filter({ hasText: "Inbox" }).click();
      await expect(drawer).not.toBeVisible();
      await expect(page.locator(".dashboard-heading h1")).toHaveText("Inbox");
      await toggle.click();
      await drawer.locator(".nav-item").filter({ hasText: "Work" }).click();
      await expect(drawer).not.toBeVisible();
    }
    if (width < 399) {
      await expect(
        page
          .locator(".view-segment")
          .getByRole("button", { name: "Grid", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator(".tasks")).toHaveClass("tasks list");
    } else {
      await page
        .locator(".view-segment")
        .getByRole("button", { name: "Grid", exact: true })
        .click();
      const sizing = await page.locator(".tasks").evaluate((e) => ({
        columns: getComputedStyle(e).gridTemplateColumns.split(" ").length,
        expected: Math.max(
          1,
          Math.floor(
            (e.clientWidth + parseFloat(getComputedStyle(e).gap)) /
              (294 + parseFloat(getComputedStyle(e).gap)),
          ),
        ),
      }));
      expect(sizing.columns).toBe(sizing.expected);
    }
    if (!mobile) {
      await expect(
        page.getByRole("button", { name: "Open project menu" }),
      ).toHaveCount(0);
      await expect(page.locator("aside")).toBeVisible();
      expect(
        await page
          .locator("aside")
          .evaluate((e) => e.getBoundingClientRect().width),
      ).toBe(280);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/navigation-${width}.png`,
      fullPage: true,
    });
  });

test("grid selection survives narrow screens and drawer closes on desktop resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto("/");
  await page
    .locator(".view-segment")
    .getByRole("button", { name: "Grid", exact: true })
    .click();
  await page.setViewportSize({ width: 398, height: 900 });
  await expect(page.locator(".tasks")).toHaveClass("tasks list");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("todo_app")).projects.find(
          (p) => p.project_id === "work",
        ).project_view,
    ),
  ).toBe("grid");
  await page.setViewportSize({ width: 399, height: 900 });
  await expect(page.locator(".tasks")).toHaveClass("tasks grid");
  await page.getByRole("button", { name: "Open project menu" }).click();
  await expect(
    page.getByRole("dialog", { name: "Project navigation" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 760, height: 900 });
  await expect(
    page.getByRole("dialog", { name: "Project navigation" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
});

for (const width of [360, 399, 600, 759, 760, 1440])
  test(`header, main toggle and centered controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator(".task-excerpt strong")).toHaveText("Bold notes");
    const header = await page.locator(".header").evaluate((e) => ({
      right: e.getBoundingClientRect().right,
      padding: parseFloat(getComputedStyle(e).paddingRight),
    }));
    expect(
      await page
        .locator(".date")
        .evaluate((e) => e.getBoundingClientRect().right),
    ).toBeCloseTo(header.right - header.padding, 0);
    if (width < 760) {
      await expect(
        page.locator("main").getByRole("button", { name: "Open project menu" }),
      ).toBeVisible();
      await expect(page.locator("header .menu-toggle")).toHaveCount(0);
      const main = await page.locator("main").evaluate((e) => ({
        left: e.getBoundingClientRect().left,
        top: e.getBoundingClientRect().top,
        paddingX: parseFloat(getComputedStyle(e).paddingLeft),
        paddingY: parseFloat(getComputedStyle(e).paddingTop),
      }));
      const toggle = await page.locator(".menu-toggle").evaluate((e) => ({
        left: e.getBoundingClientRect().left,
        top: e.getBoundingClientRect().top,
      }));
      expect(toggle.left).toBeCloseTo(main.left + main.paddingX, 0);
      expect(toggle.top).toBeCloseTo(main.top + main.paddingY, 0);
    }
    const controls = await page
      .locator("button:visible")
      .evaluateAll((elements) =>
        elements.map((e) => ({
          text: e.textContent,
          align: getComputedStyle(e).alignItems,
          justify: getComputedStyle(e).justifyContent,
        })),
      );
    expect(
      controls.filter((c) => c.align !== "center" || c.justify !== "center"),
    ).toEqual([]);
    const insets = await page
      .locator(".task-selects select")
      .evaluateAll((elements) =>
        elements.map((e) => ({
          left: parseFloat(getComputedStyle(e).paddingLeft),
          inset: parseFloat(
            getComputedStyle(e).getPropertyValue("--select-inset"),
          ),
          position: getComputedStyle(e).backgroundPosition,
        })),
      );
    for (const value of insets) {
      expect(value.left).toBe(value.inset);
      expect(value.position).toContain(`${value.inset}px`);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/alignment-${width}.png`,
      fullPage: true,
    });
  });

for (const width of [360, 399, 600, 635, 636, 759, 760, 1000, 1440])
  test(`grid never squeezes task cards below 294px at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator(".task-excerpt strong")).toHaveText("Bold notes");
    const sizes = await page
      .locator(".tasks .task-card, .tasks .add-task")
      .evaluateAll((elements) =>
        elements.map((e) => e.getBoundingClientRect().width),
      );
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(294);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const selector of [".plus", ".menu-toggle", ".pin"]) {
      const centered = await page.locator(selector).evaluateAll((elements) =>
        elements
          .filter((e) => e.getClientRects().length)
          .map((e) => {
            const svg = e.querySelector("svg");
            if (!svg) return true;
            const a = e.getBoundingClientRect();
            const children = [...e.children].map((child) =>
              child.getBoundingClientRect(),
            );
            const left = Math.min(...children.map((r) => r.left));
            const right = Math.max(...children.map((r) => r.right));
            const top = Math.min(...children.map((r) => r.top));
            const bottom = Math.max(...children.map((r) => r.bottom));
            const b = {
              x: left,
              y: top,
              width: right - left,
              height: bottom - top,
            };
            return (
              Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < 1 &&
              Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 1
            );
          }),
      );
      expect(centered.every(Boolean)).toBe(true);
    }
    if ([399, 636, 1440].includes(width))
      await page.screenshot({
        path: `test-results/grid-min-${width}.png`,
        fullPage: true,
      });
  });

for (const width of [360, 398, 399, 600, 759, 760])
  test(`combined workspace actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("/");
    await expect(page.locator(".task-excerpt strong")).toHaveText("Bold notes");
    if (width < 760) {
      const group = page.getByRole("group", { name: "Workspace actions" });
      await expect(group.getByRole("button")).toHaveCount(3);
      await expect(page.locator(".header-actions")).toHaveCount(0);
      const rects = await group.getByRole("button").evaluateAll((elements) =>
        elements.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
      if (width <= 398) {
        expect(rects[0].x).toBe(rects[1].x);
        expect(rects[1].y).toBeGreaterThan(rects[0].y + rects[0].height);
        expect(rects[2].y).toBeGreaterThan(rects[1].y + rects[1].height);
      } else {
        expect(rects[0].y).toBe(rects[1].y);
        expect(rects[1].y).toBe(rects[2].y);
        expect(rects[1].x).toBeGreaterThan(rects[0].x);
        expect(rects[2].x).toBeGreaterThan(rects[1].x);
      }
      expect(
        await group.evaluate((e) => getComputedStyle(e).borderBottomWidth),
      ).toBe("1px");
      expect(
        await group.evaluate((e) => e.getBoundingClientRect().bottom),
      ).toBeLessThan(
        await page
          .locator(".dashboard-heading")
          .evaluate((e) => e.getBoundingClientRect().top),
      );
      await group
        .getByRole("button", { name: "+ Add Project", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close dialog" }).click();
      await group
        .getByRole("button", { name: "+ Add Task", exact: true })
        .click();
      await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close dialog" }).click();
      await group.getByRole("button", { name: "Open project menu" }).click();
      await expect(
        page.getByRole("dialog", { name: "Project navigation" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    } else {
      await expect(
        page.getByRole("group", { name: "Workspace actions" }),
      ).toHaveCount(0);
      await expect(
        page.locator(".header-actions").getByRole("button"),
      ).toHaveCount(2);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/workspace-actions-${width}.png`,
      fullPage: true,
    });
  });

for (const scenario of ["both", "sidebar", "main"])
  test(`independent desktop scrolling: ${scenario}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.addInitScript(
      ({ scenario }) => {
        const tasks =
          scenario === "sidebar"
            ? []
            : Array.from({ length: 35 }, (_, i) => ({
                task_id: `scroll-task-${i}`,
                task_title: `Scroll task ${i}`,
                task_description: "Description",
                task_status: "pending",
                task_priority: "low",
                task_due_date: "",
              }));
        const count = scenario === "main" ? 1 : 25;
        localStorage.setItem(
          "todo_app",
          JSON.stringify({
            selectedProjectId: "scroll-project-0",
            projects: Array.from({ length: count }, (_, i) => ({
              project_id: `scroll-project-${i}`,
              project_title: `Scroll project ${i}`,
              project_priority: i + 1,
              project_view: "list",
              project_filter: "all",
              todoList: i === 0 ? tasks : [],
            })),
          }),
        );
      },
      { scenario },
    );
    await page.goto("/");
    const main = page.locator("main"),
      sidebar = page.locator(".workspace > aside");
    await expect(
      page.getByRole("heading", { name: "Scroll project 0", exact: true }),
    ).toBeVisible();
    const initial = await page.evaluate(() => ({
      header: document.querySelector(".header").getBoundingClientRect().top,
      sidebarOverflow:
        document.querySelector(".workspace > aside").scrollHeight >
        document.querySelector(".workspace > aside").clientHeight,
      mainOverflow:
        document.querySelector("main").scrollHeight >
        document.querySelector("main").clientHeight,
      pageOverflow: document.scrollingElement.scrollHeight > innerHeight,
      mainRight: document.querySelector("main").getBoundingClientRect().right,
    }));
    expect(initial.sidebarOverflow).toBe(scenario !== "main");
    expect(initial.mainOverflow).toBe(scenario !== "sidebar");
    expect(initial.pageOverflow).toBe(false);
    expect(initial.mainRight).toBeCloseTo(1440, 0);
    if (scenario !== "main") {
      await sidebar.hover();
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() => sidebar.evaluate((e) => e.scrollTop))
        .toBeGreaterThan(0);
      expect(await main.evaluate((e) => e.scrollTop)).toBe(0);
    }
    const sidePosition = await sidebar.evaluate((e) => e.scrollTop);
    if (scenario !== "sidebar") {
      await main.hover();
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() => main.evaluate((e) => e.scrollTop))
        .toBeGreaterThan(0);
      expect(await sidebar.evaluate((e) => e.scrollTop)).toBe(sidePosition);
    }
    expect(
      await page
        .locator(".header")
        .evaluate((e) => e.getBoundingClientRect().top),
    ).toBe(initial.header);
  });

test("mobile drawer scrolls independently from the main content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open project menu" }).click();
  const drawer = page.locator(".sidebar-drawer");
  await expect(drawer).toBeVisible();
  await drawer.locator("aside").evaluate((e) => {
    const spacer = document.createElement("div");
    spacer.style.height = "1600px";
    e.append(spacer);
  });
  await drawer.hover();
  await page.mouse.wheel(0, 450);
  await expect
    .poll(() => drawer.evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
  expect(await page.locator("main").evaluate((e) => e.scrollTop)).toBe(0);
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
});
