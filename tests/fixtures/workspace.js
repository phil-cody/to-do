import { test, expect } from "@playwright/test";
const seed = {
  projects: [
    {
      project_id: "inbox",
      project_title: "Inbox",
      project_view: "grid",
      project_filter: "all",
      project_type: "inbox",
      project_priority: 1,
      project_pinned: true,
      todoList: [],
    },
    {
      project_id: "work",
      project_title: "Work",
      project_view: "grid",
      project_filter: "all",
      project_priority: 2,
      project_description: "**Project notes**",
      todoList: [
        {
          task_id: "old",
          task_title: "Legacy task",
          task_description: "## Details\n\n**Bold notes**",
          task_status: "pending",
          task_priority: "high",
          task_due_date: "2026-10-30",
          task_createdAt: "2026-06-17T10:55:01.599Z",
        },
      ],
    },
  ],
  selectedProjectId: "work",
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("todo_app"))
      localStorage.setItem("todo_app", JSON.stringify(data));
  }, seed);
});

export { test, expect, seed };
