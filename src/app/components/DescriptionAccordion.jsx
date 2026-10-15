import React, { useId, useState } from "react";
import Description from "./Markdown.jsx";
import { t } from "../i18n.js";
export default function DescriptionAccordion({ value, label, className }) {
  const [expanded, setExpanded] = useState(false),
    id = useId();
  if (!value) return null;
  return (
    <section
      className={`description-accordion ${className} ${expanded ? "is-expanded" : "is-collapsed"}`}
      aria-label={label}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        {t(expanded ? "Collapse" : "Expand")}
      </button>
      <div
        id={id}
        className={`description-accordion-content ${className}-content`}
      >
        <Description value={value} />
      </div>
    </section>
  );
}
