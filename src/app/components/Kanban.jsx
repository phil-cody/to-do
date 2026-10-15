import React, { useId, useState } from "react";
import { taskGroup, taskGroups } from "../model.js";
import Icon from "./Icon.jsx";
import useKanbanDrag from "../hooks/useKanbanDrag.js";
export default function Kanban({ tasks, day, renderTask, onDrop, busy }) {
  const id = useId(),
    [overrides, setOverrides] = useState({});
  const { drag, handleProps } = useKanbanDrag(onDrop);
  const columns = Object.entries(taskGroups).map(([key, label]) => ({
    key,
    label,
    tasks: tasks.filter((task) => taskGroup(task, day) === key),
  }));
  // Preserve status order within each group; empty columns follow populated ones.
  columns.sort((a, b) => Number(!a.tasks.length) - Number(!b.tasks.length));
  return (
    <div className="kanban">
      {drag && (
        <div
          className="kanban-drag-preview"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          {drag.title}
          <small>
            {drag.target ? taskGroups[drag.target] : "Move to a status column"}
          </small>
        </div>
      )}
      {columns.map((column) => {
        const { key, label, tasks: items } = column,
          collapsed = overrides[key] ?? !items.length;
        return (
          <section
            key={key}
            data-kanban-status={key}
            className={`kanban-column column-${key} ${collapsed ? "is-collapsed" : ""} ${drag?.target === key ? "is-drop-target" : ""}`}
            onDragOver={(event) => {
              if (key !== "overdue") event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (key !== "overdue")
                onDrop(event.dataTransfer.getData("text/plain"), key);
            }}
          >
            <h3>
              <button
                className="column-toggle"
                aria-label={`${label}: ${items.length} tasks`}
                aria-expanded={!collapsed}
                aria-controls={`${id}-${key}`}
                onClick={() =>
                  setOverrides((state) => ({ ...state, [key]: !collapsed }))
                }
              >
                <span className="column-label">{label}</span>
                <span className="column-count">{items.length}</span>
                <Icon name="chevron" className={collapsed ? "is-closed" : ""} />
              </button>
            </h3>
            <div
              id={`${id}-${key}`}
              className="kanban-content"
              hidden={collapsed}
            >
              {items.map((task) =>
                renderTask(task, { dragHandleProps: handleProps(task, busy) }),
              )}
              {key === "overdue" && (
                <p className="column-note">
                  Unfinished tasks with a past due date.
                </p>
              )}
              {!items.length && <p className="empty">No tasks here yet</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
