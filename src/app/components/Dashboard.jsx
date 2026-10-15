import React from "react";
import Icon from "./Icon.jsx";
import Kanban from "./Kanban.jsx";
import Select from "./Select.jsx";
import Description from "./Markdown.jsx";
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
  onShowProjects,
  onAddTask,
  onUpdateTask,
  renderProject,
  renderTask,
}) {
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h1>{selected?.project_title || "All tasks & projects"}</h1>
          <Description
            value={
              selected?.project_description ||
              "Everything you’re working on, in one place."
            }
          />
        </div>
        <div className="stats">
          <span>{tasks.length} Tasks</span>
          <span className="danger">
            {tasks.filter((t) => matches(t, "overdue")).length} Overdue
          </span>
          <span className="success">
            {
              tasks.filter(
                (t) =>
                  matches(t, "date-today") && t.task_status !== "completed",
              ).length
            }{" "}
            Today
          </span>
          <span>
            {selected
              ? `Priority #${selected.project_priority}`
              : `${projects.length} Projects`}
          </span>
        </div>
      </div>
      {isAll && (
        <section className="all-projects" aria-label="All projects">
          <div className="section-heading">
            <h2>Projects</h2>
            <button onClick={onShowProjects}>Open dashboard ↗</button>
          </div>
          <div className="project-grid">{projects.map(renderProject)}</div>
        </section>
      )}
      {isAll && (
        <div className="section-heading">
          <h2>All tasks</h2>
          <span className="muted">{shown.length} shown</span>
        </div>
      )}
      <div className="controls">
        <div className="view-segment" aria-label="Task views">
          {[
            ["grid", "Grid", "grid"],
            ["list", "List", "list"],
            ["kanban", "Kanban", null],
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
            label="Filter"
            value={filter}
            options={filters}
            onChange={(v) => onPreference("project_filter", v)}
          />
        </div>
        <input
          aria-label="Search tasks"
          type="search"
          placeholder="Search tasks…"
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
            if (task && !busy) onUpdateTask(task, { task_status: status });
          }}
        />
      ) : (
        <div className={`tasks ${view}`}>
          {shown.map(renderTask)}
          <button className="add-task" onClick={onAddTask}>
            <span aria-hidden="true" className="plus">
              <Icon name="plus" />
            </span>
            <strong>Add new task</strong>
          </button>
        </div>
      )}
      {view === "kanban" && (
        <button
          className="primary kanban-add"
          aria-label="+ Add new task"
          onClick={onAddTask}
        >
          <Icon name="plus" />
          <span>Add new task</span>
        </button>
      )}
      {!shown.length && (
        <p className="empty">
          {tasks.length
            ? "No tasks match your filters."
            : "A fresh start. Add your first task."}
        </p>
      )}
    </>
  );
}
