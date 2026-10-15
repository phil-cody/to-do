import test from "node:test";
import assert from "node:assert/strict";
import { normalize, orderedProjects } from "../src/app/model.js";
import {
  toggleProjectPin,
  removeProject,
  removeTask,
  saveProject,
  setPreference,
} from "../src/app/workspace.js";
import { selectDashboard } from "../src/app/selectors.js";

function workspace() {
  return normalize({
    selectedProjectId: "a",
    projects: [
      {
        project_id: "inbox",
        project_title: "Inbox",
        project_type: "inbox",
        project_priority: 1,
        project_pinned: true,
        todoList: [],
      },
      {
        project_id: "a",
        project_title: "A",
        project_priority: 3,
        todoList: [
          { task_id: "task", task_title: "Test", task_due_date: "2026-10-30" },
        ],
      },
      {
        project_id: "b",
        project_title: "B",
        project_priority: 2,
        todoList: [],
      },
    ],
  });
}

test("pin/unpin/repin appends to pinned group without mutating the old snapshot", () => {
  const original = workspace();
  let next = toggleProjectPin(toggleProjectPin(original, "a"), "b");
  assert.deepEqual(
    orderedProjects(next.projects).map((p) => p.project_id),
    ["inbox", "a", "b"],
  );
  next = toggleProjectPin(toggleProjectPin(next, "a"), "a");
  assert.deepEqual(
    orderedProjects(next.projects).map((p) => p.project_id),
    ["inbox", "b", "a"],
  );
  assert.equal(original.projects[1].project_pinned, false);
});

test("project deletion protects Inbox/last project and removes a selected project's tasks", () => {
  const original = workspace();
  assert.throws(() => removeProject(original, "inbox"), /cannot be deleted/);
  const next = removeProject(original, "a");
  assert.equal(next.selectedProjectId, "all");
  assert.equal(selectDashboard(next).allTasks.length, 0);
  assert.equal(original.projects[1].todoList.length, 1);
  const only = { ...original, projects: [original.projects[1]] };
  assert.throws(() => removeProject(only, "a"), /cannot be deleted/);
});

test("duplicate project names are rejected before modifying the workspace", () => {
  const data = workspace();
  assert.throws(
    () => saveProject(data, { ...data.projects[2], project_title: "a" }),
    /already exists/,
  );
  assert.equal(data.projects[2].project_title, "B");
});

test("compact view is temporary and preferences belong to the selected scope", () => {
  let data = workspace();
  assert.equal(selectDashboard(data, { compact: true }).view, "list");
  assert.equal(data.projects[1].project_view, "grid");
  data = setPreference(data, "project_view", "kanban");
  assert.equal(selectDashboard(data).view, "kanban");
  data = setPreference(
    { ...data, selectedProjectId: "all" },
    "project_view",
    "list",
  );
  assert.equal(data.allView, "list");
  assert.equal(data.projects[1].project_view, "kanban");
  assert.equal(selectDashboard(removeTask(data, "task")).allTasks.length, 0);
});
