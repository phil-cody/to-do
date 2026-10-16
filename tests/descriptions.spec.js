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

test("short descriptions have no toggle; long project and task descriptions adapt to width", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const data = JSON.parse(localStorage.getItem("todo_app"));
    data.projects[1].project_description = "Short project text";
    data.projects[1].todoList[0].task_description = "Short task text";
    localStorage.setItem("todo_app", JSON.stringify(data));
  });
  await page.goto("/");
  await expect(
    page.locator(".description-accordion .wmde-markdown"),
  ).toHaveCount(2);
  await expect(page.locator(".description-accordion > button")).toHaveCount(0);
  await page.getByRole("button", { name: "▦ Project dashboard" }).click();
  await expect(
    page
      .getByRole("dialog")
      .locator(".project-card-description .wmde-markdown"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("dialog").locator(".description-accordion > button"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .locator(".task-card")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const text =
    "A description with enough words to fit two lines when the task is wide but wrap across many more lines in a narrow card.";
  await page.getByLabel("Description · Markdown").fill(text);
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.setViewportSize({ width: 1600, height: 1000 });
  const description = page.locator(".task-excerpt");
  await expect(description.locator(".wmde-markdown")).toHaveText(text);
  await expect(description.getByRole("button")).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 1000 });
  await expect(
    description.getByRole("button", { name: "Expand", exact: true }),
  ).toBeVisible();
  await description
    .getByRole("button", { name: "Expand", exact: true })
    .click();
  await expect(
    description.getByRole("button", { name: "Collapse", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(description.getByRole("button")).toHaveCount(0);
});

test("dashboard project descriptions reveal hidden Markdown and keep their controls independent", async ({
  page,
  context,
}) => {
  await context.route("https://example.com/**", (route) =>
    route.fulfill({ body: "Test link destination" }),
  );
  await page.addInitScript(() => {
    const data = JSON.parse(localStorage.getItem("todo_app"));
    data.projects[1].project_description =
      "**Project text**\n\nSecond paragraph\n\nThird paragraph\n\n[Project link](https://example.com/project)";
    localStorage.setItem("todo_app", JSON.stringify(data));
  });
  await page.goto("/");
  await page.getByRole("button", { name: "▦ Project dashboard" }).click();
  const dialog = page.getByRole("dialog");
  const card = dialog
    .locator(".project-card")
    .filter({ has: page.getByRole("heading", { name: "Work", exact: true }) });
  await card.getByRole("heading", { name: "Work", exact: true }).click();
  await expect(dialog).toBeVisible();
  await card.locator("strong").click();
  await expect(dialog).toBeVisible();
  await card.getByRole("button", { name: "Expand", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Collapse", exact: true }),
  ).toBeVisible();
  const popupEvent = page.waitForEvent("popup");
  await card.getByRole("link", { name: "Project link" }).click();
  const popup = await popupEvent;
  await popup.close();
  await expect(dialog).toBeVisible();
  await card.getByRole("button", { name: "Pin Work", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Unpin Work", exact: true }),
  ).toBeVisible();
  await card.click({ position: { x: 5, y: 5 } });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".dashboard-heading h1")).toHaveText("Work");
  await page.getByRole("button", { name: "▦ Project dashboard" }).click();
  await dialog
    .getByRole("button", { name: "Inbox", exact: true })
    .press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".dashboard-heading h1")).toHaveText("Inbox");
});

for (const width of [360, 1440]) {
  test(`sidebar project opens from background but leaves text and action buttons independent at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const mobile = width < 760;
    if (mobile)
      await page.getByRole("button", { name: "Open project menu" }).click();
    const card = page.locator(".project-nav").filter({
      has: page.getByRole("button", { name: "Inbox", exact: true }),
    });
    await card.locator(".nav-item").click();
    await expect(page.locator(".dashboard-heading h1")).toHaveText("Work");
    await card
      .getByRole("button", { name: "Unpin Inbox", exact: true })
      .click();
    await expect(page.locator(".dashboard-heading h1")).toHaveText("Work");
    if (mobile)
      await expect(
        page.getByRole("dialog", { name: "Project navigation" }),
      ).toBeVisible();
    await card.click({ position: { x: 5, y: 5 } });
    await expect(page.locator(".dashboard-heading h1")).toHaveText("Inbox");
    if (mobile)
      await expect(
        page.getByRole("dialog", { name: "Project navigation" }),
      ).not.toBeVisible();
  });
}

test("padding of a short code block does not create an unnecessary expand button", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const data = JSON.parse(localStorage.getItem("todo_app"));
    data.projects[1].todoList[0].task_description = "```\nOne code line\n```";
    localStorage.setItem("todo_app", JSON.stringify(data));
  });
  await page.goto("/");
  await expect(page.locator(".task-excerpt code")).toHaveText(
    "One code line\n",
  );
  await expect(page.locator(".task-excerpt").getByRole("button")).toHaveCount(
    0,
  );
});
