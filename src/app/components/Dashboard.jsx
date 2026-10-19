import { t } from "../i18n.js";
import React from "react";
import Icon from "./Icon.jsx";
import Kanban from "./Kanban.jsx";
import Select from "./Select.jsx";
import Description from "./Markdown.jsx";
import DescriptionAccordion from "./DescriptionAccordion.jsx";
import { filters } from "../constants.js";
import { matches } from "../model.js";
import filterIcon from "../../assets/image/filter-icon.svg";
export default function Dashboard({
  selected,
  isAll,
  tasks,
  projects,
  shown,
  view,
  filter,
  compact,
  busy,
  day,
  projectId,
  allTasks,
  search,
  onSearch,
  onPreference,
  onAddTask,
  onUpdateTask,
  renderTask,
}) {
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h1>{selected?.project_title || t("All tasks & projects")}</h1>
          {selected ? (
            <DescriptionAccordion
              key={selected.project_id}
              value={selected.project_description}
              label={t("Project description")}
              className="project-description"
            />
          ) : (
            <Description
              value={t("Everything you’re working on, in one place.")}
            />
          )}
        </div>
        <div className="stats">
          <span>{t("Tasks: {count}", { count: tasks.length })}</span>
          <span className="danger">
            {tasks.filter((t) => matches(t, "overdue")).length} {t("Overdue")}
          </span>
          <span className="success">
            {
              tasks.filter(
                (t) =>
                  matches(t, "date-today") && t.task_status !== "completed",
              ).length
            }{" "}
            {t("Today")}
          </span>
          <span>
            {selected
              ? t("Priority #{number}", { number: selected.project_priority })
              : t("{count} Projects", { count: projects.length })}
          </span>
        </div>
      </div>
      {isAll && (
        <div className="section-heading">
          <h2>{t("All tasks")}</h2>
          <span className="muted">
            {t("{count} shown", { count: shown.length })}
          </span>
        </div>
      )}
      <div className="controls">
        <div className="view-segment" aria-label={t("Task views")}>
          {[
            ["grid", t("Grid"), "grid"],
            ["list", t("List"), "list"],
            ["kanban", t("Kanban"), null],
          ]
            .filter(([key]) => !(compact && key === "grid"))
            .map(([key, text, icon]) => (
              <button
                key={key}
                className={view === key ? "is-active" : ""}
                aria-pressed={view === key}
                disabled={busy}
                onClick={() => onPreference("project_view", key)}
              >
                {icon && <Icon name={icon} />}
                {text}
              </button>
            ))}
        </div>
        <div className="filter-select">
          <img src={filterIcon} alt="" />
          <Select
            label={t("Filter")}
            value={filter}
            options={Object.entries(filters).map(([key, label]) => [
              key,
              t(label),
            ])}
            onChange={(v) => onPreference("project_filter", v)}
          />
        </div>
        <input
          aria-label={t("Search tasks")}
          type="search"
          placeholder={t("Search tasks…")}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {view === "kanban" ? (
        <Kanban
          key={projectId}
          tasks={shown}
          busy={busy}
          day={day}
          renderTask={renderTask}
          onDrop={(id, status) => {
            const task = allTasks.find((task) => task.task_id === id);
            if (task && !busy)
              return onUpdateTask(task, { task_status: status });
          }}
        />
      ) : (
        <div className={`tasks ${view}`}>
          {shown.map(renderTask)}
          <button disabled={busy} className="add-task" onClick={onAddTask}>
            <span aria-hidden="true" className="plus">
              <Icon name="plus" />
            </span>
            <strong>{t("Add new task")}</strong>
          </button>
        </div>
      )}
      {view === "kanban" && (
        <button
          className="primary kanban-add"
          disabled={busy}
          aria-label={t("+ Add new task")}
          onClick={onAddTask}
        >
          <Icon name="plus" />
          <span>{t("Add new task")}</span>
        </button>
      )}
      {!shown.length && (
        <p className="empty">
          {tasks.length
            ? t("No tasks match your filters.")
            : t("A fresh start. Add your first task.")}
        </p>
      )}
    </>
  );
}
