import { t } from "../i18n.js";
import React from "react";
import Select from "./Select.jsx";
import DescriptionAccordion from "./DescriptionAccordion.jsx";
import { statuses, priorities, matches, formatDueDate } from "../model.js";
export default function TaskCard({
  task,
  isAll,
  draggable,
  dragHandleProps,
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
      onPointerDown={(event) => {
        if (
          event.pointerType === "mouse" &&
          !event.target.closest("button, select, input, textarea, a")
        )
          dragHandleProps?.onPointerDown(event);
      }}
      onPointerMove={dragHandleProps?.onPointerMove}
      onPointerUp={dragHandleProps?.onPointerUp}
      onPointerCancel={dragHandleProps?.onPointerCancel}
      onLostPointerCapture={dragHandleProps?.onLostPointerCapture}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.task_id)}
    >
      <div className="task-selects">
        <Select
          label={t("Status")}
          value={task.task_status}
          options={Object.fromEntries(
            Object.entries(statuses).map(([key, label]) => [key, t(label)]),
          )}
          onChange={(v) => onUpdate(task, { task_status: v })}
        />
        <Select
          label={t("Priority")}
          value={task.task_priority}
          options={Object.fromEntries(
            Object.entries(priorities).map(([key, label]) => [key, t(label)]),
          )}
          onChange={(v) => onUpdate(task, { task_priority: v })}
        />
      </div>
      <h3>{task.task_title}</h3>
      <DescriptionAccordion
        className="task-excerpt"
        label={t("Task description")}
        value={task.task_description || t("No description yet.")}
      />
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
        <button onClick={() => onEdit(task)}>{t("Edit")}</button>
        <button
          className="danger"
          disabled={busy}
          onClick={() => onDelete(task)}
        >
          {t("Delete")}
        </button>
        <button onClick={() => onShow(task)}>{t("Show more")}</button>
        {dragHandleProps && (
          <button
            type="button"
            className="task-drag-handle"
            {...dragHandleProps}
          >
            {t("Move")}
          </button>
        )}
      </div>
    </article>
  );
}
