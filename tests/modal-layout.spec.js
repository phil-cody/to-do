import { test, expect } from "./fixtures/workspace.js";

for (const width of [360, 1440]) {
  test(`dashboard keeps the close button clear of scrolling content at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.addInitScript(() => {
      const data = JSON.parse(localStorage.getItem("todo_app"));
      data.projects[1].todoList = Array.from({ length: 30 }, (_, i) => ({
        ...data.projects[1].todoList[0],
        task_id: `task-${i}`,
        task_title: `Task ${i}`,
      }));
      for (let i = 0; i < 12; i++)
        data.projects.push({
          ...data.projects[1],
          project_id: `extra-${i}`,
          project_title: `Project ${i}`,
          todoList: [],
        });
      localStorage.setItem("todo_app", JSON.stringify(data));
    });
    await page.goto("/");
    await page.locator("main").evaluate((element) => {
      element.scrollTop = 100;
    });
    if (width < 760)
      await page
        .getByRole("button", { name: "Open project menu", exact: true })
        .click();
    const mainPosition = await page
      .locator("main")
      .evaluate((element) => element.scrollTop);
    await page
      .getByRole("button", { name: "▦ Project dashboard", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Project dashboard",
      exact: true,
    });
    const close = dialog.getByRole("button", {
      name: "Close dialog",
      exact: true,
    });
    await close.focus();
    const before = await close.boundingBox();
    const geometry = await dialog.evaluate((element) => {
      const body = element.querySelector(".modal-scroll");
      const button = element
        .querySelector(".modal-heading button")
        .getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      const scroll = body.getBoundingClientRect();
      return {
        overflowing: body.scrollHeight > body.clientHeight,
        topGap: button.top - bounds.top,
        rightGap: bounds.right - button.right,
        bodyTop: scroll.top,
        buttonBottom: button.bottom,
        bodyRight: scroll.right,
        dialogRight: bounds.right,
        bodyBottom: scroll.bottom,
        dialogBottom: bounds.bottom,
      };
    });
    expect(geometry.overflowing).toBe(true);
    expect(geometry.topGap).toBeGreaterThan(6);
    expect(geometry.rightGap).toBeGreaterThan(6);
    expect(geometry.bodyTop - geometry.buttonBottom).toBeGreaterThan(6);
    expect(geometry.dialogRight - geometry.bodyRight).toBeGreaterThan(6);
    expect(geometry.dialogBottom - geometry.bodyBottom).toBeGreaterThan(6);
    await expect(page.locator("main")).toHaveCSS("overflow-y", "hidden");
    await expect(page.locator("body")).toHaveCSS("overflow-y", "hidden");
    await dialog.locator(".modal-scroll").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await dialog.locator(".modal-scroll").hover();
    await page.mouse.wheel(0, 600);
    expect(await close.boundingBox()).toEqual(before);
    expect(
      await page.locator("main").evaluate((element) => element.scrollTop),
    ).toBe(mainPosition);
    await page.screenshot({
      path: `test-results/dashboard-scroll-${width}.png`,
    });
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("main")).toHaveCSS("overflow-y", "auto");
    expect(
      await page.locator("main").evaluate((element) => element.scrollTop),
    ).toBe(mainPosition);
    await page.locator("main").hover();
    await page.mouse.wheel(0, 300);
    await expect
      .poll(() => page.locator("main").evaluate((element) => element.scrollTop))
      .toBeGreaterThan(mainPosition);
  });

  for (const kind of ["task", "project"]) {
    test(`new ${kind} keeps its close button outside the scroll area at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 500 });
      await page.goto("/");
      await page
        .getByRole("button", {
          name: kind === "task" ? "+ Add Task" : "+ Add Project",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      const close = dialog.getByRole("button", {
        name: "Close dialog",
        exact: true,
      });
      await close.focus();
      const before = await close.boundingBox();
      const bounds = await dialog.boundingBox();
      expect(bounds.x + bounds.width - before.x - before.width).toBeGreaterThan(
        6,
      );
      expect(before.y - bounds.y).toBeGreaterThan(6);
      for (const control of [
        dialog.getByRole("button", {
          name: kind === "task" ? "Save task" : "Save project",
          exact: true,
        }),
        dialog.getByLabel("Title", { exact: true }),
      ]) {
        await control.focus();
        await control.evaluate((element) =>
          element.scrollIntoView({ block: "start" }),
        );
        const clearance = await control.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const body = element.closest(".modal-scroll").getBoundingClientRect();
          const style = getComputedStyle(element);
          const ring =
            parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
          return {
            ring,
            top: bounds.top - body.top,
            bottom: body.bottom - bounds.bottom,
            left: bounds.left - body.left,
            right: body.right - bounds.right,
          };
        });
        for (const edge of ["top", "bottom", "left", "right"])
          expect(clearance[edge]).toBeGreaterThanOrEqual(clearance.ring);
      }
      await dialog.locator(".modal-scroll").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      expect(await close.boundingBox()).toEqual(before);
      await expect(page.locator("main")).toHaveCSS("overflow-y", "hidden");
      await close.click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator("main")).toHaveCSS("overflow-y", "auto");
    });
  }
}
