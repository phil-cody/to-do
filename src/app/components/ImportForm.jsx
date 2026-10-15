import { t } from "../i18n.js";
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
        throw new Error(t("The file is too large. Maximum: 2 MB."));
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
        {t(
          "Prepare a project using the template or choose a Todo backup. The file is checked in your browser; data is added only after confirmation.",
        )}
      </p>
      <div className="account-actions">
        <button
          type="button"
          onClick={() => downloadJson(template, "todo-project-template.json")}
        >
          {t("Download project template")}
        </button>
        <button
          type="button"
          disabled={busy || reading}
          onClick={downloadCurrent}
        >
          {t("Download current tasks")}
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
                    t(
                      "No local tasks exist at this address. Upload a backup file.",
                    ),
                  );
                prepare(raw, t("Local tasks in this browser"));
              } catch (error) {
                setError(error.message);
              }
            }}
          >
            {t("Read local tasks")}
          </button>
        )}
      </div>
      <label>
        {t("Project or backup file (JSON, up to 2 MB)")}
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy || reading}
          onChange={readFile}
        />
      </label>
      {reading && <p role="status">{t("Processing data…")}</p>}
      {error && <p role="alert">{t(error)}</p>}
      {preview && (
        <section className="import-preview" aria-label={t("Import preview")}>
          <h3>{t("Preview")}</h3>
          <p>{preview.source}</p>
          <p>
            {t("Projects in file:")} {preview.projects.length}. {t("Tasks:")}{" "}
            {preview.taskCount}.
          </p>
          <div className="import-projects">
            {preview.projects.slice(0, 50).map((project, index) => (
              <article key={index}>
                <h4>
                  {project.project_title} ·{" "}
                  {t("Tasks: {count}", { count: project.todoList.length })}
                </h4>
                {project.project_type === "inbox" && (
                  <p>{t("Inbox tasks will be added to your Inbox.")}</p>
                )}
                <Description value={project.project_description} />
                <ul>
                  {project.todoList.slice(0, 20).map((task, number) => (
                    <li key={number}>
                      <strong>{task.task_title}</strong> —{" "}
                      {t(statuses[task.task_status])},{" "}
                      {t(priorities[task.task_priority])}
                      {task.task_due_date ? `, ${task.task_due_date}` : ""}
                    </li>
                  ))}
                </ul>
                {project.todoList.length > 20 && (
                  <p>
                    {t("And {count} more tasks.", {
                      count: project.todoList.length - 20,
                    })}
                  </p>
                )}
              </article>
            ))}
            {preview.projects.length > 50 && (
              <p>
                {t("And {count} more projects.", {
                  count: preview.projects.length - 50,
                })}
              </p>
            )}
          </div>
          <p>
            {t(
              "Existing data will be preserved. Projects with duplicate names get an import suffix. Uploading again creates new copies.",
            )}
          </p>
          <button className="primary" disabled={busy || reading} type="submit">
            {busy ? t("Adding…") : t("Add projects and tasks")}
          </button>
        </section>
      )}
    </form>
  );
}
