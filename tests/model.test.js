import { normalizeDescription } from "../src/app/description.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  orderedProjects,
  sortedTasks,
  upsertTask,
  matches,
  today,
  taskGroup,
} from "../src/app/model.js";
import { LocalRepository, HttpRepository } from "../src/app/repository.js";
const project = (id, priority = 1, pinned = false, pos = 0) => ({
  project_id: id,
  project_title: id,
  project_priority: priority,
  project_pinned: pinned,
  project_pin_position: pos,
  todoList: [],
});
test("migrates old storage, retains IDs, pins, inbox and repairs task ownership", () => {
  const d = normalize({
    projects: [
      {
        ...project("a", 1, true),
        project_type: "inbox",
        todoList: [
          {
            task_id: "t",
            task_title: "Old task",
            task_due_date: "2026-10-30T00:00:00Z",
          },
        ],
      },
    ],
    selectedProjectId: "missing",
  });
  assert.equal(d.selectedProjectId, "a");
  assert.equal(d.projects[0].project_type, "inbox");
  assert.equal(d.projects[0].project_pinned, true);
  assert.equal(d.projects[0].todoList[0].task_project, "a");
  assert.equal(d.projects[0].todoList[0].task_due_date, "2026-10-30");
});
test("pinned projects come first regardless of priority", () => {
  const a = project("a", 3),
    b = project("b", 2, true, 1),
    c = project("c", 1);
  assert.deepEqual(
    orderedProjects([a, b, c]).map((p) => p.project_id),
    ["b", "c", "a"],
  );
  a.project_priority = 0;
  assert.deepEqual(
    orderedProjects([a, b, c]).map((p) => p.project_id),
    ["b", "a", "c"],
  );
});
test("date precedes priority, no due date comes last", () => {
  assert.deepEqual(
    sortedTasks([
      { task_id: "a", task_due_date: "2026-10-30", task_priority: "low" },
      { task_id: "b", task_due_date: "2026-10-30", task_priority: "high" },
      { task_id: "c", task_due_date: "2026-10-29", task_priority: "low" },
      { task_id: "d", task_due_date: "", task_priority: "high" },
    ]).map((t) => t.task_id),
    ["c", "b", "a", "d"],
  );
});
test("moving tasks removes them from the source and keeps exactly one copy", () => {
  const a = project("a"),
    b = project("b");
  a.todoList = [{ task_id: "t", task_project: "a" }];
  const next = upsertTask(
    { projects: [a, b] },
    { task_id: "t", task_project: "b" },
  );
  assert.equal(next.projects[0].todoList.length, 0);
  assert.equal(next.projects[1].todoList.length, 1);
  assert.equal(a.todoList.length, 1);
  assert.throws(() =>
    upsertTask(next, { task_id: "t", task_project: "missing" }),
  );
});
test("overdue excludes completed and undated tasks", () => {
  assert.equal(
    matches(
      { task_due_date: "2000-01-01", task_status: "completed" },
      "overdue",
    ),
    false,
  );
  assert.equal(
    matches({ task_due_date: "", task_status: "pending" }, "overdue"),
    false,
  );
  assert.equal(matches({ task_due_date: today() }, "date-today"), true);
});
test("bad local data is never overwritten", async () => {
  let saved = false;
  const repo = new LocalRepository({
    getItem: () => "{broken",
    setItem: () => {
      saved = true;
    },
  });
  await assert.rejects(repo.load());
  assert.equal(saved, false);
});
test("repository roundtrip and server errors", async () => {
  let raw;
  const repo = new LocalRepository({
    getItem: () => raw,
    setItem: (key, value) => {
      raw = value;
    },
  });
  const d = normalize({ projects: [] });
  await repo.save(d);
  assert.deepEqual(await repo.load(), d);
  const remote = new HttpRepository("/api", async () => ({
    ok: false,
    status: 503,
  }));
  await assert.rejects(remote.load(), /503/);
  await assert.rejects(remote.save(d), /503/);
});

test("API cannot send workspace data to an external origin", async () => {
  let called = false;
  const repo = new HttpRepository(
    "https://third-party.example/workspace",
    async () => {
      called = true;
    },
  );
  await assert.rejects(repo.load(), /same origin/);
  await assert.rejects(repo.save({ projects: [] }), /same origin/);
  assert.equal(called, false);
});
test("API blocks redirects and sends credentials only to own origin", async () => {
  let options;
  const repo = new HttpRepository("/api/workspace", async (_url, opts) => {
    options = opts;
    return { ok: true };
  });
  await repo.save({ projects: [] });
  assert.equal(options.redirect, "error");
  assert.equal(options.credentials, "same-origin");
});

test("sort groups are overdue, in-process, pending and completed, then date and priority", () => {
  const tasks = [
    {
      task_id: "done",
      task_status: "completed",
      task_due_date: "2000-01-01",
      task_priority: "high",
    },
    {
      task_id: "pending",
      task_status: "pending",
      task_due_date: "2026-10-15",
      task_priority: "high",
    },
    {
      task_id: "process",
      task_status: "in-process",
      task_due_date: "2026-10-30",
      task_priority: "low",
    },
    {
      task_id: "late-low",
      task_status: "in-process",
      task_due_date: "2026-10-10",
      task_priority: "low",
    },
    {
      task_id: "late-high",
      task_status: "pending",
      task_due_date: "2026-10-10",
      task_priority: "high",
    },
    {
      task_id: "late-old",
      task_status: "pending",
      task_due_date: "2026-10-09",
      task_priority: "low",
    },
  ];
  assert.deepEqual(
    sortedTasks(tasks, "2026-10-14").map((t) => t.task_id),
    ["late-old", "late-high", "late-low", "process", "pending", "done"],
  );
  assert.equal(taskGroup(tasks[0], "2026-10-14"), "completed");
  assert.equal(taskGroup(tasks[3], "2026-10-14"), "overdue");
  assert.equal(
    taskGroup(
      { task_status: "pending", task_due_date: "2026-10-14" },
      "2026-10-14",
    ),
    "pending",
  );
  assert.equal(
    taskGroup(
      { task_status: "pending", task_due_date: "2026-10-14" },
      "2026-10-15",
    ),
    "overdue",
  );
});
test("multiple pins form a FIFO group before ordinary projects", () => {
  const first = project("first", 99, true, 0),
    latest = project("latest", 100, true, 1),
    other = project("other", 1);
  assert.deepEqual(
    orderedProjects([other, first, latest]).map((p) => p.project_id),
    ["first", "latest", "other"],
  );
  latest.project_pinned = false;
  assert.deepEqual(
    orderedProjects([other, first, latest]).map((p) => p.project_id),
    ["first", "other", "latest"],
  );
});

test("legacy inline checklists are rendered correctly at load without individually saving tasks", () => {
  const original =
    "- Используя макет от Stitch стилизовать проект [x] - стилизовать десктопную версию [ ] - добавить адаптивное отображение для всех экранов";
  const expected =
    "- Используя макет от Stitch стилизовать проект\n- [x] стилизовать десктопную версию\n- [ ] добавить адаптивное отображение для всех экранов";
  assert.equal(normalizeDescription(original), expected);
  assert.equal(normalizeDescription(expected), expected);
  const p = project("p");
  p.todoList = [{ task_id: "old", task_description: original }];
  const data = normalize({ projects: [p] });
  assert.equal(data.projects[0].todoList[0].task_description, expected);
  assert.equal(p.todoList[0].task_description, original);
});
test("valid markdown and fenced, indented and inline code are preserved", () => {
  for (const text of [
    "- [x] - task text",
    "- [ ] normal task",
    "```js\n[x] - code\n```",
    "~~~\n[ ] - code\n~~~",
    "    [x] - code",
    "`[x] - inline code`",
  ])
    assert.equal(normalizeDescription(text), text);
  assert.equal(
    normalizeDescription("[X] - Complete\r\n[ ] - Pending"),
    "- [x] Complete\n- [ ] Pending",
  );
});
