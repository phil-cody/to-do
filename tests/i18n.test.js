import test from "node:test";
import assert from "node:assert/strict";
import { messages } from "../src/app/i18n-messages.js";
import { translate, setLanguage, getLanguage } from "../src/app/i18n.js";
import { sortedTasks } from "../src/app/model.js";

test("Both languages have complete messages with identical placeholders and preserve user text", () => {
  for (const [en, ru] of Object.entries(messages)) {
    assert.ok(ru.trim(), en);
    const tokens = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(tokens(en), tokens(ru), en);
    assert.equal(translate(en, "ru"), ru, en);
  }
  assert.equal(
    translate("Delete “{title}”?", "ru", { title: "Edit" }),
    "Удалить «Edit»?",
  );
  assert.equal(
    translate(
      "Проект 1, задача 2, срок: нужна существующая дата ГГГГ-ММ-ДД или пустая строка.",
      "en",
    ),
    "Project 1, task 2, due date: expected a real YYYY-MM-DD date or an empty string.",
  );
  assert.equal(translate("File", "ru"), "Файл");
});

test("Equal status, due date and priority sort by title before creation time, consistently for Russian and English", () => {
  const previous = getLanguage();
  try {
    for (const [language, titles] of [
      ["en", ["Zulu", "alpha", "Bravo"]],
      ["ru", ["Яблоко", "арбуз", "Банан"]],
    ]) {
      setLanguage(language);
      const tasks = titles.map((task_title, index) => ({
        task_title,
        task_id: String(index),
        task_status: "pending",
        task_priority: "low",
        task_due_date: "2026-12-01",
        task_createdAt: `2026-01-0${index + 1}`,
      }));
      assert.deepEqual(
        sortedTasks(tasks).map((task) => task.task_title),
        [titles[1], titles[2], titles[0]],
      );
      tasks[0].task_priority = "high";
      assert.equal(sortedTasks(tasks)[0].task_title, titles[0]);
    }
  } finally {
    setLanguage(previous);
  }
});
