// Compare styles and geometry using an isolated browser and synthetic data.
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const mode = process.argv[2] || "compare";
const browser = await chromium.launch();
const snapshots = [];
const project = (id, title, tasks = []) => ({
  project_id: id,
  project_title: title,
  project_priority: id === "inbox" ? 1 : 2,
  project_type: id === "inbox" ? "inbox" : "custom",
  project_pinned: id === "inbox",
  project_view: "grid",
  project_description: "**Project notes**",
  todoList: tasks,
});
const seed = {
  selectedProjectId: "work",
  projects: [
    project("inbox", "Inbox"),
    project("work", "Work", [
      {
        task_id: "test",
        task_project: "work",
        task_title: "Legacy task",
        task_description: "## Details\n\n**Bold notes**",
        task_status: "pending",
        task_priority: "high",
        task_due_date: "2026-10-30",
      },
    ]),
  ],
};
const selectors = [
  ".header",
  ".brand",
  ".date",
  ".header-actions button",
  ".mobile-actions button",
  "aside",
  ".project-nav",
  ".project-nav .nav-item",
  ".project-group-title",
  "main",
  ".dashboard-heading",
  ".dashboard-heading h1",
  ".dashboard-heading .wmde-markdown",
  ".stats",
  ".controls",
  ".view-segment",
  ".view-segment button",
  ".filter-select select",
  ".controls input",
  ".task-card",
  ".task-card h3",
  ".task-excerpt",
  ".task-selects select",
  ".task-card .actions button",
  ".add-task",
  ".plus",
  ".kanban-column",
  ".column-toggle",
  "dialog[open]",
  ".modal-heading",
  "form input",
  ".description-field",
  ".w-md-editor",
  ".form-fields",
  ".save",
];
const properties = [
  "display",
  "position",
  "fontSize",
  "lineHeight",
  "color",
  "backgroundColor",
  "padding",
  "margin",
  "gap",
  "borderRadius",
  "borderWidth",
  "minWidth",
  "alignItems",
  "justifyContent",
  "textAlign",
];
try {
  for (const width of [360, 399, 636, 760, 1440]) {
    const context = await browser.newContext({
        viewport: { width, height: 1100 },
      }),
      page = await context.newPage();
    await page.addInitScript(
      (data) => localStorage.setItem("todo_app", JSON.stringify(data)),
      seed,
    );
    await page.clock.install({ time: new Date("2026-10-14T10:00:00Z") });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:4000");
    await page.locator(".task-excerpt strong").waitFor();
    async function capture(view) {
      snapshots.push({
        width,
        view,
        values: await page.evaluate(
          ({ selectors, properties }) =>
            Object.fromEntries(
              selectors.map((selector) => [
                selector,
                [...document.querySelectorAll(selector)]
                  .filter(
                    (e) =>
                      e.getClientRects().length &&
                      !e.closest("[hidden]") &&
                      getComputedStyle(e).visibility !== "hidden",
                  )
                  .map((e) => {
                    const r = e.getBoundingClientRect(),
                      s = getComputedStyle(e);
                    return {
                      rect: [r.x, r.y, r.width, r.height].map(
                        (n) => Math.round(n * 100) / 100,
                      ),
                      ...Object.fromEntries(properties.map((p) => [p, s[p]])),
                    };
                  }),
              ]),
            ),
          { selectors, properties },
        ),
      });
    }
    await capture("initial");
    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.locator(".tasks.list").waitFor();
    await capture("list");
    await page.getByRole("button", { name: "Kanban", exact: true }).click();
    await page.locator(".kanban").waitFor();
    await capture("kanban");
    await page.getByRole("button", { name: "+ Add Task", exact: true }).click();
    await page.getByLabel("Description · Markdown").waitFor();
    await capture("form");
    await context.close();
  }
  await mkdir(".cache", { recursive: true });
  if (mode === "capture") {
    await writeFile(
      ".cache/visual-baseline.json",
      JSON.stringify(snapshots, null, 2),
    );
    console.log("Saved baseline for 5 widths and 4 UI states.");
  } else {
    const baseline = JSON.parse(
      await readFile(".cache/visual-baseline.json", "utf8"),
    );
    let differences = 0;
    for (let i = 0; i < snapshots.length; i++)
      for (const selector of selectors)
        if (
          JSON.stringify(baseline[i].values[selector]) !==
          JSON.stringify(snapshots[i].values[selector])
        ) {
          differences++;
          console.log(
            `${snapshots[i].width}px / ${snapshots[i].view}: ${selector}`,
          );
        }
    await writeFile(
      ".cache/visual-current.json",
      JSON.stringify(snapshots, null, 2),
    );
    console.log(`${differences} changed selector snapshots.`);
    if (differences) process.exitCode = 1;
  }
} finally {
  await browser.close();
}
