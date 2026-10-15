import React, { useId, useState } from "react";
import Description from "./Markdown.jsx";
import { t } from "../i18n.js";
export default function ProjectDescription({ value }) {
  const [expanded, setExpanded] = useState(false),
    id = useId();
  if (!value) return null;
  return (
    <section
      className={`project-description ${expanded ? "is-expanded" : "is-collapsed"}`}
      aria-label={t("Project description")}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        {t(expanded ? "Collapse" : "Expand")}
      </button>
      <div id={id} className="project-description-content">
        <Description value={value} />
      </div>
    </section>
  );
}
