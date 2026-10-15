import test from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../src/app/model.js";
import { mergeEdit, MergeConflict } from "../src/app/sync/merge.js";
const initial = () =>
  normalize({
    projects: [
      {
        project_id: "p",
        project_title: "Project",
        project_description: "",
        todoList: [
          {
            task_id: "t",
            task_title: "Task",
            task_description: "",
            task_due_date: "",
            task_status: "pending",
            task_priority: "low",
          },
        ],
      },
    ],
  });
test("Special object property names remain ordinary project and task IDs during synchronization", () => {
  for (const id of ["__proto__", "constructor", "toString"]) {
    const base = initial();
    base.projects[0].project_id = id;
    base.projects[0].todoList[0].task_id = id;
    base.projects[0].todoList[0].task_project = id;
    const mine = structuredClone(base);
    mine.projects[0].todoList[0].task_title = "Preserved edit";
    const result = mergeEdit(base, mine, base);
    assert.equal(result.projects.length, 1);
    assert.equal(result.projects[0].project_id, id);
    assert.equal(result.projects[0].todoList.length, 1);
    assert.equal(result.projects[0].todoList[0].task_id, id);
    assert.equal(result.projects[0].todoList[0].task_title, "Preserved edit");
    assert.equal(Object.prototype.task_title, undefined);
  }
});
test("Merge preserves independent fields and additions on another device", () => {
  const base = initial(),
    mine = structuredClone(base),
    remote = structuredClone(base);
  mine.projects[0].todoList[0].task_title = "Mine";
  remote.projects[0].todoList[0].task_priority = "high";
  remote.projects[0].todoList.push({
    ...remote.projects[0].todoList[0],
    task_id: "other",
  });
  const result = mergeEdit(base, mine, remote);
  assert.equal(result.projects[0].todoList.length, 2);
  assert.equal(result.projects[0].todoList[0].task_title, "Mine");
  assert.equal(result.projects[0].todoList[0].task_priority, "high");
  assert.equal(base.projects[0].todoList[0].task_title, "Task");
});
test("Same-field edits conflict; explicit resolution changes only my fields", () => {
  const base = initial(),
    mine = structuredClone(base),
    remote = structuredClone(base);
  mine.projects[0].todoList[0].task_title = "Mine";
  remote.projects[0].todoList[0].task_title = "Theirs";
  remote.projects[0].todoList[0].task_priority = "high";
  assert.throws(() => mergeEdit(base, mine, remote), MergeConflict);
  const result = mergeEdit(base, mine, remote, { force: true });
  assert.equal(result.projects[0].todoList[0].task_priority, "high");
  assert.equal(result.projects[0].todoList[0].task_title, "Mine");
});
test("Deletion conflicts with concurrent editing and with new tasks in deleted projects", () => {
  const base = initial(),
    mine = structuredClone(base),
    remote = structuredClone(base);
  mine.projects[0].todoList = [];
  remote.projects[0].todoList[0].task_description = "Other device";
  assert.throws(() => mergeEdit(base, mine, remote), MergeConflict);
  const empty = structuredClone(base);
  empty.projects = [{ ...base.projects[0], project_id: "q", todoList: [] }];
  remote.projects[0].todoList.push({
    ...remote.projects[0].todoList[0],
    task_id: "new",
  });
  assert.throws(() => mergeEdit(base, empty, remote), MergeConflict);
});
