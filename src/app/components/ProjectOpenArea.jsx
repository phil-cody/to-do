import React from "react";
// A separate native control keeps nested links, text selection and action
// buttons independent, while making the card background keyboard accessible.
export default function ProjectOpenArea({ project, busy, onChoose }) {
  return (
    <button
      className="project-open-area"
      aria-label={project.project_title}
      disabled={busy}
      onClick={() => onChoose(project.project_id)}
    />
  );
}
