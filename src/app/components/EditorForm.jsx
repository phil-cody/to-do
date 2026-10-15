import { t } from "../i18n.js";
import React, { Suspense, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import { markdownComponents } from "../markdown.jsx";
import { statuses, priorities, workspaceLimits } from "../model.js";
import Select from "./Select.jsx";
import { MDEditor } from "./Markdown.jsx";
export default function EditorForm({ kind, item, projects, onSave, busy }) {
  const isTask = kind === "task",
    prefix = isTask ? "task" : "project";
  const [draft, setDraft] = useState(item);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft[`${prefix}_title`].trim())
          onSave({
            ...draft,
            [`${prefix}_title`]: draft[`${prefix}_title`].trim(),
          });
      }}
    >
      <label>
        {t("Title")}
        <input
          autoFocus
          required
          maxLength={workspaceLimits.title}
          value={draft[`${prefix}_title`]}
          onChange={(e) => set(`${prefix}_title`, e.target.value)}
          placeholder={
            isTask
              ? t("What needs to get done?")
              : t("Give your project a name")
          }
        />
      </label>
      <div className="description-field">
        <span id="description-label">{t("Description · Markdown")}</span>
        <Suspense fallback={<p>{t("Loading editor…")}</p>}>
          <MDEditor
            value={draft[`${prefix}_description`]}
            onChange={(v) => set(`${prefix}_description`, v || "")}
            preview="edit"
            height={220}
            textareaProps={{ "aria-labelledby": "description-label" }}
            previewOptions={{
              rehypePlugins: [rehypeSanitize],
              components: markdownComponents,
            }}
          />
        </Suspense>
      </div>
      <div className="form-fields">
        {isTask ? (
          <>
            <Select
              label={t("Project")}
              value={draft.task_project}
              options={Object.fromEntries(
                projects.map((p) => [p.project_id, p.project_title]),
              )}
              onChange={(v) => set("task_project", v)}
            />
            <label>
              {t("Due date")}
              <input
                type="date"
                value={draft.task_due_date}
                onChange={(e) => set("task_due_date", e.target.value)}
              />
            </label>
            <Select
              label={t("Status")}
              value={draft.task_status}
              options={Object.fromEntries(
                Object.entries(statuses).map(([key, label]) => [key, t(label)]),
              )}
              onChange={(v) => set("task_status", v)}
            />
            <Select
              label={t("Priority")}
              value={draft.task_priority}
              options={Object.fromEntries(
                Object.entries(priorities).map(([key, label]) => [
                  key,
                  t(label),
                ]),
              )}
              onChange={(v) => set("task_priority", v)}
            />
          </>
        ) : (
          <label>
            {t("Project order")}
            <input
              required
              type="number"
              min="1"
              max={workspaceLimits.projectOrder}
              value={draft.project_priority}
              onChange={(e) => set("project_priority", Number(e.target.value))}
            />
            <small>
              {t("Lower numbers appear first among unpinned projects.")}
            </small>
          </label>
        )}
      </div>
      <button className="primary save" disabled={busy} type="submit">
        {busy
          ? t("Saving…")
          : t(kind === "task" ? "Save task" : "Save project")}
      </button>
    </form>
  );
}
