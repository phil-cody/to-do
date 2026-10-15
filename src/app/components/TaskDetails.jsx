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
      <Description value={detail.task_description || "No description yet."} />
      <div className="form-fields">
        <Select
          label="Project"
          value={detail.task_project}
          options={Object.fromEntries(
            projects.map((p) => [p.project_id, p.project_title]),
          )}
          onChange={(v) => onUpdate(detail, { task_project: v })}
        />
        <Select
          label="Status"
          value={detail.task_status}
          options={statuses}
          onChange={(v) => onUpdate(detail, { task_status: v })}
        />
        <Select
          label="Priority"
          value={detail.task_priority}
          options={priorities}
          onChange={(v) => onUpdate(detail, { task_priority: v })}
        />
        <div className="detail-due">
          <span>Due</span>
          <time dateTime={detail.task_due_date || undefined}>
            {formatDueDate(detail.task_due_date)}
          </time>
        </div>
      </div>
      <div className="actions">
        <button onClick={() => onEdit(detail)}>Edit task</button>
        <button
          className="danger"
          disabled={busy}
          onClick={() => onDelete(detail)}
        >
          Delete task
        </button>
      </div>
    </div>
  );
}
