import { t } from "../i18n.js";
import React from "react";
import Select from "./Select.jsx";
import Description from "./Markdown.jsx";
import { statuses, priorities, formatDueDate } from "../model.js";
export default function TaskDetails({
  task: detail,
  projects,
  busy,
  onUpdate,
  onEdit,
  onDelete,
}) {
  return (
    <div className="details">
      <Description
        value={detail.task_description || t("No description yet.")}
      />
      <div className="form-fields">
        <Select
          label={t("Project")}
          value={detail.task_project}
          options={projects.map((p) => [p.project_id, p.project_title])}
          onChange={(v) => onUpdate(detail, { task_project: v })}
        />
        <Select
          label={t("Status")}
          value={detail.task_status}
          options={Object.entries(statuses).map(([key, label]) => [
            key,
            t(label),
          ])}
          onChange={(v) => onUpdate(detail, { task_status: v })}
        />
        <Select
          label={t("Priority")}
          value={detail.task_priority}
          options={Object.entries(priorities).map(([key, label]) => [
            key,
            t(label),
          ])}
          onChange={(v) => onUpdate(detail, { task_priority: v })}
        />
        <div className="detail-due">
          <span>{t("Due")}</span>
          <time dateTime={detail.task_due_date || undefined}>
            {formatDueDate(detail.task_due_date)}
          </time>
        </div>
      </div>
      <div className="actions">
        <button disabled={busy} onClick={() => onEdit(detail)}>
          {t("Edit task")}
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={() => onDelete(detail)}
        >
          {t("Delete task")}
        </button>
      </div>
    </div>
  );
}
