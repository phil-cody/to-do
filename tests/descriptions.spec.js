import { test, expect } from "./fixtures/workspace.js";

for (const width of [360, 1440]) {
  test(`sidebar project preview renders sanitized Markdown at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      const data = JSON.parse(localStorage.getItem("todo_app"));
      data.projects[1].project_description =
        '**Project notes** and [a link](https://example.com)\n\n![tracker](https://tracker.example/image)<iframe src="https://tracker.example/frame"></iframe><img src="https://tracker.example/raw" onerror="alert(1)">';
      localStorage.setItem("todo_app", JSON.stringify(data));
    });
    const external = [];
    page.on("request", (request) => {
      if (request.url().includes("tracker.example"))
        external.push(request.url());
    });
    await page.goto("/");
    if (width < 760)
      await page
        .getByRole("button", { name: "Open project menu", exact: true })
        .click();
    const description = page.locator(".project-nav-description");
    await expect(description.locator("strong")).toHaveText("Project notes");
    await expect(
      description.getByRole("link", { name: "a link" }),
    ).toHaveAttribute("href", "https://example.com");
    await expect(
      description.getByRole("link", { name: "a link" }),
    ).toHaveAttribute("rel", "noopener noreferrer");
    await expect(description).not.toContainText("**");
    await expect(
      description.locator("img,iframe,script,[onerror]"),
    ).toHaveCount(0);
    expect(external).toEqual([]);
    expect(
      await description.evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThanOrEqual(18);
  });
}

for (const view of ["Grid", "List", "Kanban"]) {
  test(`task descriptions expand independently in ${view} without saving or losing Markdown`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const data = JSON.parse(localStorage.getItem("todo_app"));
      const first = data.projects[1].todoList[0];
      first.task_description =
        "**First line**\n\nSecond paragraph\n\n- One\n- Two\n\n[Last paragraph](https://example.com)";
      data.projects[1].todoList.push({
        ...first,
        task_id: "second",
        task_title: "Second task",
      });
      localStorage.setItem("todo_app", JSON.stringify(data));
    });
    await page.goto("/");
    await page.getByRole("button", { name: view, exact: true }).click();
    const before = await page.evaluate(() => localStorage.getItem("todo_app"));
    const cards = page.locator(".task-card");
    const first = cards.filter({
      has: page.getByRole("heading", { name: "Legacy task", exact: true }),
    });
    const second = cards.filter({
      has: page.getByRole("heading", { name: "Second task", exact: true }),
    });
    const toggle = first.getByRole("button", { name: "Expand", exact: true });
    const content = first.locator(".description-accordion-content");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const collapsedHeight = await content.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(collapsedHeight).toBeLessThanOrEqual(48);
    await toggle.click();
    await expect(
      first.getByRole("button", { name: "Collapse", exact: true }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      await content.evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThan(collapsedHeight);
    await expect(content.locator("strong")).toHaveText("First line");
    await expect(content.locator("li")).toHaveText(["One", "Two"]);
    await expect(
      second.getByRole("button", { name: "Expand", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await first.getByRole("button", { name: "Collapse", exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("todo_app"))).toBe(
      before,
    );
    await first.getByRole("button", { name: "Show more", exact: true }).click();
    await expect(
      page.getByRole("dialog").getByRole("link", { name: "Last paragraph" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Expand", exact: true }),
    ).toHaveCount(0);
  });
}
