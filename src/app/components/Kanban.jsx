import { t } from "../i18n.js";
import React, { useId, useState } from "react";
import { taskGroup, taskGroups } from "../model.js";
import Icon from "./Icon.jsx";
import useKanbanDrag from "../hooks/useKanbanDrag.js";
export default function Kanban({ tasks, day, renderTask, onDrop, busy }) {
  const id = useId(),
    [overrides, setOverrides] = useState({}),
    [pendingMove, setPendingMove] = useState(null),
    [moveError, setMoveError] = useState("");
  const move = async (id, status) => {
    if (
      busy ||
      pendingMove ||
      tasks.find((task) => task.task_id === id)?.task_status === status
    )
      return;
    setMoveError("");
    setPendingMove({ id, status });
    try {
      const saved = await onDrop(id, status);
      if (saved !== false)
        setOverrides((state) => ({ ...state, [status]: false }));
    } catch (error) {
      setMoveError(
        t("Changes could not be saved: {message}", {
          message: t(error.message),
        }),
      );
    } finally {
      setPendingMove(null);
    }
  };
  const { drag, handleProps } = useKanbanDrag(move);
  const displayedTasks = tasks.map((task) =>
    pendingMove?.id === task.task_id
      ? { ...task, task_status: pendingMove.status }
      : task,
  );
  const columns = Object.entries(taskGroups).map(([key, label]) => ({
    key,
    label: t(label),
    tasks: displayedTasks.filter((task) => taskGroup(task, day) === key),
  }));
  // Preserve status order within each group; empty columns follow populated ones.
  columns.sort((a, b) => Number(!a.tasks.length) - Number(!b.tasks.length));
  return (
    <div className="kanban">
      {moveError && (
        <p className="error" role="alert">
          {moveError}
        </p>
      )}
      {drag && (
        <div
          className="kanban-drag-preview"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          {drag.title}
          <small>
            {drag.target
              ? t(taskGroups[drag.target])
              : t("Move to a status column")}
          </small>
        </div>
      )}
      {columns.map((column) => {
        const { key, label, tasks: items } = column,
          collapsed =
            pendingMove?.status === key
              ? false
              : (overrides[key] ?? !items.length);
        return (
          <section
            key={key}
            data-kanban-status={key}
            className={`kanban-column column-${key} ${collapsed ? "is-collapsed" : ""} ${drag?.target === key ? "is-drop-target" : ""}`}
          >
            <h3>
              <button
                className="column-toggle"
                aria-label={t("{status}: {count} tasks", {
                  status: label,
                  count: items.length,
                })}
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
                renderTask(task, {
                  saving: pendingMove?.id === task.task_id,
                  dragHandleProps: handleProps(
                    task,
                    busy || !!pendingMove,
                    key,
                  ),
                }),
              )}
              {key === "overdue" && (
                <p className="column-note">
                  {t("Unfinished tasks with a past due date.")}
                </p>
              )}
              {!items.length && (
                <p className="empty">{t("No tasks here yet")}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
