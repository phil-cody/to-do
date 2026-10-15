import React, { useEffect, useRef, useState } from "react";
import template from "../../../docs/templates/project-template.json";
import { parseProjectImport } from "../import-project.js";
import { statuses, priorities, workspaceLimits } from "../model.js";
import Description from "./Markdown.jsx";
import { downloadJson } from "../files.js";

export default function ImportForm({ busy, remote, onImport, exportData }) {
  const [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [reading, setReading] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  function prepare(raw, source) {
    setPreview({ ...parseProjectImport(raw), source });
  }
  async function downloadCurrent() {
    const ticket = ++generation.current;
    setError("");
    setReading(true);
    try {
      const draft = await exportData();
      if (ticket === generation.current)
        downloadJson(draft, "todo_app.backup.json");
    } catch (error) {
      if (ticket === generation.current) setError(error.message);
    } finally {
      if (ticket === generation.current) setReading(false);
    }
  }
  async function readFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const ticket = ++generation.current;
    setError("");
    setPreview(null);
    setReading(true);
    try {
      if (file.size > workspaceLimits.snapshotBytes)
        throw new Error("Файл слишком большой. Максимум — 2 МБ.");
      const raw = await file.text();
      if (ticket === generation.current) prepare(raw, file.name);
    } catch (error) {
      if (ticket === generation.current) setError(error.message);
    } finally {
      if (ticket === generation.current) setReading(false);
    }
  }
  return (
    <form
      className="import-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (preview && !busy && !reading) void onImport(preview);
      }}
    >
      <p>
        Подготовьте проект по шаблону или выберите резервную копию Todo. Файл
        проверяется в браузере; данные добавятся только после подтверждения.
      </p>
      <div className="account-actions">
        <button
          type="button"
          onClick={() => downloadJson(template, "todo-project-template.json")}
        >
          Скачать шаблон проекта
        </button>
        <button
          type="button"
          disabled={busy || reading}
          onClick={downloadCurrent}
        >
          Скачать текущие задачи
        </button>
        {remote && (
          <button
            type="button"
            disabled={busy || reading}
            onClick={() => {
              setError("");
              setPreview(null);
              try {
                const raw = localStorage.getItem("todo_app");
                if (!raw)
                  throw new Error(
                    "На этом адресе нет локальных задач. Загрузите резервную копию файлом.",
                  );
                prepare(raw, "Локальные задачи этого браузера");
              } catch (error) {
                setError(error.message);
              }
            }}
          >
            Прочитать локальные задачи
          </button>
        )}
      </div>
      <label>
        Файл проекта или резервной копии (JSON, до 2 МБ)
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy || reading}
          onChange={readFile}
        />
      </label>
      {reading && <p role="status">Обрабатываем данные…</p>}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section className="import-preview" aria-label="Предпросмотр импорта">
          <h3>Предпросмотр</h3>
          <p>{preview.source}</p>
          <p>
            Проектов в файле: {preview.projects.length}. Задач:{" "}
            {preview.taskCount}.
          </p>
          <div className="import-projects">
            {preview.projects.slice(0, 50).map((project, index) => (
              <article key={index}>
                <h4>
                  {project.project_title} · {project.todoList.length} задач
                </h4>
                {project.project_type === "inbox" && (
                  <p>Задачи Inbox будут добавлены в ваш Inbox.</p>
                )}
                <Description value={project.project_description} />
                <ul>
                  {project.todoList.slice(0, 20).map((task, number) => (
                    <li key={number}>
                      <strong>{task.task_title}</strong> —{" "}
                      {statuses[task.task_status]},{" "}
                      {priorities[task.task_priority]}
                      {task.task_due_date ? `, ${task.task_due_date}` : ""}
                    </li>
                  ))}
                </ul>
                {project.todoList.length > 20 && (
                  <p>И ещё {project.todoList.length - 20} задач.</p>
                )}
              </article>
            ))}
            {preview.projects.length > 50 && (
              <p>И ещё {preview.projects.length - 50} проектов.</p>
            )}
          </div>
          <p>
            Существующие данные сохранятся. Проекты с совпадающими названиями
            получат пометку «импорт». Повторная загрузка создаст новые копии.
          </p>
          <button className="primary" disabled={busy || reading} type="submit">
            {busy ? "Добавляем…" : "Добавить проекты и задачи"}
          </button>
        </section>
      )}
    </form>
  );
}
