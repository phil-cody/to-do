import { t } from "../i18n.js";
import React from "react";
import Icon from "./Icon.jsx";
import { matches } from "../model.js";
export default function Sidebar({
  projects,
  selected,
  isAll,
  taskCount,
  busy,
  onChoose,
  onPin,
  onDeleteProject,
  onAddProject,
  onEditProject,
  onShowProjects,
}) {
  return (
    <aside>
      <div className="sidebar-heading">
        <h2>{t("Projects")}</h2>
      </div>
      <div className="workspace-links">
        <button
          className={`nav-item ${isAll ? "active" : ""}`}
          disabled={busy}
          onClick={() => onChoose("all")}
        >
          <span>{t("All tasks & projects")}</span>
          <small>{taskCount}</small>
        </button>
        <button
          className="nav-item"
          aria-label={t("▦ Project dashboard")}
          onClick={onShowProjects}
        >
          <Icon name="grid" />
          <span>{t("Project dashboard")}</span>
        </button>
      </div>
      <button
        className="new-project primary"
        aria-label={t("+ New Project")}
        onClick={onAddProject}
      >
        <Icon name="plus" />
        <span>{t("New Project")}</span>
      </button>
      <nav aria-label={t("Projects")}>
        {[
          [
            "pinned",
            t("Pinned projects"),
            projects.filter((p) => p.project_pinned),
          ],
          [
            "other",
            t("Other projects"),
            projects.filter((p) => !p.project_pinned),
          ],
        ].map(([key, title, groupProjects]) => (
          <section
            className="project-group"
            key={key}
            aria-labelledby={`group-${key}`}
          >
            <h3 id={`group-${key}`} className="project-group-title">
              {title}
            </h3>
            {!groupProjects.length && (
              <p className="muted group-empty">{t("No projects")}</p>
            )}
            {groupProjects.map((p) => (
              <div
                className={`project-nav ${selected === p ? "active" : ""}`}
                key={p.project_id}
              >
                <button
                  disabled={busy}
                  className="nav-item"
                  onClick={() => onChoose(p.project_id)}
                >
                  <span>{p.project_title}</span>
                </button>
                <button
                  className="pin"
                  disabled={busy}
                  aria-pressed={p.project_pinned}
                  aria-label={`${p.project_pinned ? t("Unpin") : t("Pin")} ${p.project_title}`}
                  onClick={() => onPin(p)}
                >
                  <Icon name="star" filled={p.project_pinned} />
                </button>
                <p className="project-nav-description">
                  {p.project_description}
                </p>
                <div className="project-nav-stats">
                  <span>
                    {t("Tasks:")} {p.todoList.length}
                  </span>
                  <span>
                    {t("Overdue:")}{" "}
                    <b className="danger">
                      {p.todoList.filter((t) => matches(t, "overdue")).length}
                    </b>
                  </span>
                  <span>
                    {t("Done:")}{" "}
                    {
                      p.todoList.filter((t) => t.task_status === "completed")
                        .length
                    }
                  </span>
                  <span>
                    {t("Today:")}{" "}
                    <b className="success">
                      {
                        p.todoList.filter(
                          (t) =>
                            matches(t, "date-today") &&
                            t.task_status !== "completed",
                        ).length
                      }
                    </b>
                  </span>
                </div>
                <div className="actions">
                  <button onClick={() => onEditProject(p)}>{t("Edit")}</button>
                  {p.project_type !== "inbox" && projects.length > 1 && (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => onDeleteProject(p)}
                    >
                      {t("Delete")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))}
      </nav>
    </aside>
  );
}
