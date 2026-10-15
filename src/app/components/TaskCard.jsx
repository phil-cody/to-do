import React from "react";
import Select from "./Select.jsx";
import Description from "./Markdown.jsx";
import { statuses, priorities, matches, formatDueDate } from "../model.js";
export default function TaskCard({
  task,
  isAll,
  draggable,
  busy,
  projectTitle,
  onChoose,
  onUpdate,
  onEdit,
  onShow,
  onDelete,
}) {
  return (
    <article
      className={`task-card ${task.task_status === "completed" ? "completed" : ""}`}
      draggable={draggable && !busy}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.task_id)}
    >
      <div className="task-selects">
        <Select
          label="Status"
          value={task.task_status}
          options={statuses}
          onChange={(v) => onUpdate(task, { task_status: v })}
        />
        <Select
          label="Priority"
          value={task.task_priority}
          options={priorities}
          onChange={(v) => onUpdate(task, { task_priority: v })}
        />
      </div>
      <h3>{task.task_title}</h3>
      <div className="task-excerpt">
        <Description value={task.task_description || "No description yet."} />
      </div>
      {isAll && (
        <button
          className="project-link"
          disabled={busy}
          onClick={() => onChoose(task.task_project)}
        >
          {projectTitle}
        </button>
      )}
      <p className={`due ${matches(task, "overdue") ? "overdue" : ""}`}>
        {formatDueDate(task.task_due_date)}
      </p>
      <div className="actions">
        <button onClick={() => onEdit(task)}>Edit</button>
        <button
          className="danger"
          disabled={busy}
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
        <button onClick={() => onShow(task)}>Show more</button>
      </div>
    </article>
  );
}
