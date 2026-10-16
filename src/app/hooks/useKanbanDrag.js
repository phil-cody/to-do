import { t } from "../i18n.js";
import { useEffect, useRef, useState } from "react";

// Касание захватывается только ручкой: сама карточка остаётся прокручиваемой.
export default function useKanbanDrag(onDrop) {
  const [drag, setDrag] = useState(null);
  const active = useRef(null),
    frame = useRef(null),
    drop = useRef(onDrop);
  drop.current = onDrop;
  const columnAt = (x, y) => {
    const element = document.elementFromPoint(x, y);
    const column = element?.closest("[data-kanban-status]");
    if (column) return column;
    const board = element?.closest(".kanban");
    if (!board) return null;
    const columns = [...board.querySelectorAll("[data-kanban-status]")].map(
      (element) => ({ element, bounds: element.getBoundingClientRect() }),
    );
    // Пустая область под короткой колонкой тоже принадлежит её строке сетки.
    return columns.find(({ bounds }) => {
      const rowBottom = Math.max(
        ...columns
          .filter((item) => Math.abs(item.bounds.top - bounds.top) < 1)
          .map((item) => item.bounds.bottom),
      );
      return (
        x >= bounds.left &&
        x <= bounds.right &&
        y >= bounds.top &&
        y <= rowBottom
      );
    })?.element;
  };
  const targetAt = (x, y) => {
    const column = columnAt(x, y);
    const status = column?.dataset.kanbanStatus;
    return status && status !== "overdue" ? status : null;
  };
  function finish(event, cancelled = false) {
    const current = active.current;
    if (!current || current.pointerId !== event.pointerId) return;
    active.current = null;
    cancelAnimationFrame(frame.current);
    setDrag(null);
    if (!cancelled && current.moved) {
      const status = targetAt(event.clientX, event.clientY);
      if (status) drop.current(current.id, status);
    }
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function scroll() {
    const current = active.current;
    if (!current) return;
    const main = current.main,
      bounds = main.getBoundingClientRect();
    const edge = 64;
    const delta =
      current.y < bounds.top + edge
        ? -Math.min(16, (bounds.top + edge - current.y) / 4)
        : current.y > bounds.bottom - edge
          ? Math.min(16, (current.y - bounds.bottom + edge) / 4)
          : 0;
    if (current.moved) {
      // Свёрнутая колонка не должна уезжать из-под указателя перед отпусканием.
      const column = columnAt(current.x, current.y);
      if (!(
        column?.classList.contains("is-collapsed") &&
        column.dataset.kanbanStatus !== "overdue" &&
        current.y > bounds.top + 12 &&
        current.y < bounds.bottom - 12
      ))
        main.scrollTop += delta;
      setDrag({
        title: current.title,
        x: current.x,
        y: current.y,
        target: targetAt(current.x, current.y),
      });
    }
    frame.current = requestAnimationFrame(scroll);
  }
  function handleProps(task, disabled) {
    return {
      disabled,
      "aria-label": t("Move {title}", { title: task.task_title }),
      title: t("Drag to a status column; use arrow keys to change status"),
      onPointerDown(event) {
        if (
          disabled ||
          !event.isPrimary ||
          event.button !== 0 ||
          active.current
        )
          return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const main = event.currentTarget.closest("main");
        active.current = {
          id: task.task_id,
          title: task.task_title,
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
          main,
          startScrollTop: main.scrollTop,
          moved: false,
        };
        frame.current = requestAnimationFrame(scroll);
      },
      onPointerMove(event) {
        const current = active.current;
        if (!current || current.pointerId !== event.pointerId) return;
        current.x = event.clientX;
        current.y = event.clientY;
        current.moved ||=
          Math.hypot(current.x - current.startX, current.y - current.startY) >
            8 || Math.abs(current.main.scrollTop - current.startScrollTop) > 8;
      },
      onPointerUp: (event) => finish(event),
      onPointerCancel: (event) => finish(event, true),
      onLostPointerCapture: (event) => finish(event, true),
      onKeyDown(event) {
        const directions = {
          ArrowUp: -1,
          ArrowLeft: -1,
          ArrowDown: 1,
          ArrowRight: 1,
        };
        if (!directions[event.key] || disabled) return;
        event.preventDefault();
        const statuses = ["in-process", "pending", "completed"];
        const index = statuses.indexOf(task.task_status);
        const status =
          statuses[
            (index + directions[event.key] + statuses.length) % statuses.length
          ];
        drop.current(task.task_id, status);
      },
    };
  }
  return { drag, handleProps };
}
