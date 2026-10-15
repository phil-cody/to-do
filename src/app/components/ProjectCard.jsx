import { t } from "../i18n.js";
import React from "react";
import Icon from "./Icon.jsx";
import Description from "./Markdown.jsx";
export default function ProjectCard({
  project,
  projectCount,
  busy,
  onChoose,
  onPin,
  onEdit,
  onDelete,
}) {
  return (
    <article className="project-card">
      <div className="card-heading">
        <button
          className="project-title"
          disabled={busy}
          onClick={() => onChoose(project.project_id)}
        >
          {project.project_title}
        </button>
        <button
          disabled={busy}
          aria-label={`${project.project_pinned ? t("Unpin") : t("Pin")} ${project.project_title}`}
          aria-pressed={project.project_pinned}
          onClick={() => onPin(project)}
        >
          <Icon name="star" filled={project.project_pinned} />
        </button>
      </div>
      <Description value={project.project_description} />
      <div className="project-meta">
        {t("{count} tasks · {done} completed", {
          count: project.todoList.length,
          done: project.todoList.filter(
            (task) => task.task_status === "completed",
          ).length,
        })}
      </div>
      <div className="actions">
        <button onClick={() => onEdit(project)}>{t("Edit project")}</button>
        {project.project_type !== "inbox" && projectCount > 1 && (
          <button
            className="danger"
            disabled={busy}
            onClick={() => onDelete(project)}
          >
            {t("Delete")}
          </button>
        )}
      </div>
    </article>
  );
}
