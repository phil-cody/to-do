import { t } from "../i18n.js";
import React, { Suspense, useState } from "react";
import rehypeSanitize from "rehype-sanitize";
import { markdownComponents } from "../markdown.jsx";
import { statuses, priorities, workspaceLimits } from "../model.js";
import { attachmentLimits, fileAttachment } from "../attachments.js";
import Select from "./Select.jsx";
import { MDEditor } from "./Markdown.jsx";
export default function EditorForm({ kind, item, projects, onSave, busy }) {
  const isTask = kind === "task",
    prefix = isTask ? "task" : "project";
  const [draft, setDraft] = useState(item);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState("");
  const disabled = busy || reading;
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        if (draft[`${prefix}_title`].trim())
          onSave({
            ...draft,
            [`${prefix}_title`]: draft[`${prefix}_title`].trim(),
          });
      }}
    >
      <fieldset className="form-content" disabled={disabled}>
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
        {isTask && (
          <section className="attachments" aria-label={t("Attachments")}>
            <label>
              {t("Attachments")}
              <small>{t("Up to 10 files per task, 20 MB each.")}</small>
              <input
                type="file"
                multiple
                onChange={async (event) => {
                  const files = Array.from(event.target.files);
                  event.target.value = "";
                  setFileError("");
                  setReading(true);
                  try {
                    if (
                      (draft.task_attachments?.length || 0) + files.length >
                      attachmentLimits.count
                    )
                      throw new Error(
                        "Maximum: 10 files per task, 20 MB per file.",
                      );
                    const added = [];
                    for (const file of files)
                      added.push(await fileAttachment(file));
                    setDraft((current) => ({
                      ...current,
                      task_attachments: [
                        ...new Map(
                          [...(current.task_attachments || []), ...added].map(
                            (file) => [file.id, file],
                          ),
                        ).values(),
                      ],
                    }));
                  } catch (error) {
                    setFileError(error.message);
                  } finally {
                    setReading(false);
                  }
                }}
              />
            </label>
            {reading && <p role="status">{t("Reading files…")}</p>}
            {fileError && <p role="alert">{t(fileError)}</p>}
            <ul>
              {(draft.task_attachments || []).map((file) => (
                <li key={file.id}>
                  <span>
                    {file.name} · {(file.size / 1024 / 1024).toFixed(2)}{" "}
                    {t("MB")}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "task_attachments",
                        draft.task_attachments.filter(
                          (item) => item.id !== file.id,
                        ),
                      )
                    }
                    aria-label={t("Remove {name}", { name: file.name })}
                  >
                    {t("Delete")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="form-fields">
          {isTask ? (
            <>
              <Select
                label={t("Project")}
                value={draft.task_project}
                options={projects.map((p) => [p.project_id, p.project_title])}
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
                options={Object.entries(statuses).map(([key, label]) => [
                  key,
                  t(label),
                ])}
                onChange={(v) => set("task_status", v)}
              />
              <Select
                label={t("Priority")}
                value={draft.task_priority}
                options={Object.entries(priorities).map(([key, label]) => [
                  key,
                  t(label),
                ])}
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
                onChange={(e) =>
                  set("project_priority", Number(e.target.value))
                }
              />
              <small>
                {t("Lower numbers appear first among unpinned projects.")}
              </small>
            </label>
          )}
        </div>
        <button className="primary save" disabled={disabled} type="submit">
          {busy
            ? t("Saving…")
            : t(kind === "task" ? "Save task" : "Save project")}
        </button>
      </fieldset>
    </form>
  );
}
