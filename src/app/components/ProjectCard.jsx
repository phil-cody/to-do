import { t } from "../i18n.js";
import React from "react";
import Icon from "./Icon.jsx";
import DescriptionAccordion from "./DescriptionAccordion.jsx";
import ProjectOpenArea from "./ProjectOpenArea.jsx";
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
      <ProjectOpenArea project={project} busy={busy} onChoose={onChoose} />
      <div className="card-heading">
        <h3 className="project-title">{project.project_title}</h3>
        <button
          disabled={busy}
          aria-label={`${project.project_pinned ? t("Unpin") : t("Pin")} ${project.project_title}`}
          aria-pressed={project.project_pinned}
          onClick={() => onPin(project)}
        >
          <Icon name="star" filled={project.project_pinned} />
        </button>
      </div>
      <DescriptionAccordion
        value={project.project_description}
        label={t("Project description")}
        className="project-card-description"
      />
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
