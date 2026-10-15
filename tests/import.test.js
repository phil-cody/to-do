import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  parseProjectImport,
  appendProjectImport,
} from "../src/app/import-project.js";
import { normalize } from "../src/app/model.js";
import { validateSnapshot } from "../server/validation.js";
const template = () =>
  JSON.parse(readFileSync("docs/templates/project-template.json", "utf8"));

test("template import creates valid independent projects, unique names and fresh task IDs", () => {
  const source = template(),
    imported = parseProjectImport(JSON.stringify(source));
  const initial = normalize({ projects: [] }),
    original = structuredClone(initial);
  const first = appendProjectImport(initial, imported);
  const second = appendProjectImport(first, imported);
  assert.equal(first.projects.length, 2);
  assert.equal(first.projects[1].todoList.length, 2);
  assert.equal(first.projects[1].todoList[0].task_priority, "high");
  assert.equal(second.projects[2].project_title, "Мой новый проект (импорт 2)");
  assert.notEqual(first.projects[1].project_id, second.projects[2].project_id);
  assert.notEqual(
    first.projects[1].todoList[0].task_id,
    second.projects[2].todoList[0].task_id,
  );
  assert.equal(validateSnapshot(second).projects.length, 3);
  assert.deepEqual(initial, original);
  assert.deepEqual(source, template());
});

test("legacy backup merges Inbox, repairs ownership and never copies unknown properties", () => {
  const initial = normalize({ projects: [] });
  const raw = JSON.stringify({
    projects: [
      {
        project_id: initial.projects[0].project_id,
        project_type: "inbox",
        project_title: "Inbox",
        todoList: [
          {
            task_id: "old",
            task_project: "wrong",
            task_title: "Old checklist",
            task_description: "- Plan [x] - First [ ] - Next",
            injected: true,
          },
        ],
      },
    ],
  });
  const parsed = parseProjectImport(raw),
    next = appendProjectImport(initial, parsed);
  assert.equal(next.projects.length, 1);
  const task = next.projects[0].todoList[0];
  assert.equal(task.task_project, initial.projects[0].project_id);
  assert.notEqual(task.task_id, "old");
  assert.equal(task.injected, undefined);
  assert.match(task.task_description, /\n/);
  assert.equal(initial.projects[0].todoList.length, 0);
  assert.equal(validateSnapshot(next).projects[0].todoList.length, 1);
});

test("import rejects malformed files and describes the exact invalid task field", () => {
  assert.throws(() => parseProjectImport("not json"), /JSON/);
  assert.throws(() => parseProjectImport('{"projects":[]}'), /от 1 до 300/);
  assert.throws(() => parseProjectImport(" ".repeat(2_000_001)), /2 МБ/);
  const value = template();
  value.project.tasks[1].dueDate = "2026-02-30";
  assert.throws(
    () => parseProjectImport(JSON.stringify(value)),
    /задача 2, срок/,
  );
  value.project.tasks[1].dueDate = "2028-02-29";
  assert.equal(
    parseProjectImport(JSON.stringify(value)).projects[0].todoList[1]
      .task_due_date,
    "2028-02-29",
  );
  value.project.tasks[1].status = "overdue";
  assert.throws(
    () => parseProjectImport(JSON.stringify(value)),
    /задача 2, статус/,
  );
  value.project.tasks[1].status = "pending";
  value.project.tasks[1].dueDtae = "2026-01-01";
  assert.throws(() => parseProjectImport(JSON.stringify(value)), /dueDtae/);
});

test("combined workspace limits reject the entire import without altering existing data", () => {
  const initial = normalize({ projects: [] });
  initial.projects = Array.from({ length: 300 }, (_, i) => ({
    ...initial.projects[0],
    project_id: `p${i}`,
    project_title: `Project ${i}`,
  }));
  const before = structuredClone(initial);
  assert.throws(
    () =>
      appendProjectImport(
        initial,
        parseProjectImport(JSON.stringify(template())),
      ),
    /300 проектов/,
  );
  assert.deepEqual(initial, before);
});

test("every published JSON template passes the same import and server validation", () => {
  for (const filename of readdirSync("docs/templates").filter((name) =>
    name.endsWith(".json"),
  )) {
    const raw = readFileSync(`docs/templates/${filename}`, "utf8");
    const next = appendProjectImport(
      normalize({ projects: [] }),
      parseProjectImport(raw),
    );
    assert.doesNotThrow(() => validateSnapshot(next), filename);
  }
});

test("server enum validation rejects array/object values instead of coercing them to keys", () => {
  const original = appendProjectImport(
    normalize({ projects: [] }),
    parseProjectImport(JSON.stringify(template())),
  );
  for (const [field, values] of [
    ["task_status", [["pending"], {}, null, "constructor"]],
    ["task_priority", [["high"], {}, null, "constructor"]],
  ]) {
    for (const value of values) {
      const input = structuredClone(original);
      input.projects[1].todoList[0][field] = value;
      assert.throws(
        () => validateSnapshot(input),
        (error) => error.status === 422,
      );
    }
  }
});
