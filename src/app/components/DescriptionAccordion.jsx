import React, { useId, useLayoutEffect, useRef, useState } from "react";
import Description from "./Markdown.jsx";
import { t } from "../i18n.js";
export default function DescriptionAccordion({ value, label, className }) {
  const [expanded, setExpanded] = useState(false),
    [overflows, setOverflows] = useState(false),
    section = useRef(null),
    content = useRef(null),
    id = useId();
  useLayoutEffect(() => {
    const host = section.current,
      source = content.current;
    if (!host || !source) return;
    let active = true;
    const measure = () => {
      if (!active || !source.querySelector(".wmde-markdown")) return;
      const width = source.getBoundingClientRect().width;
      if (!width) return;
      // Measure a collapsed copy without changing the visible layout, selection
      // or scroll position of an expanded description.
      const probe = document.createElement("div");
      probe.className = `description-accordion ${className} is-collapsed description-measure`;
      probe.style.width = `${width}px`;
      probe.setAttribute("aria-hidden", "true");
      probe.inert = true;
      const copy = source.cloneNode(true);
      copy.removeAttribute("id");
      for (const element of copy.querySelectorAll("[id]"))
        element.removeAttribute("id");
      probe.append(copy);
      host.append(probe);
      const markdown = copy.querySelector(".wmde-markdown");
      const clipped =
        copy.scrollHeight > copy.clientHeight + 1 ||
        markdown.scrollHeight > markdown.clientHeight + 1;
      let hidden = false;
      if (clipped) {
        const bottom = Math.min(
          copy.getBoundingClientRect().bottom,
          markdown.getBoundingClientRect().bottom,
        );
        const texts = document.createTreeWalker(markdown, NodeFilter.SHOW_TEXT);
        let text;
        while ((text = texts.nextNode())) {
          if (!text.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(text);
          if (
            [...range.getClientRects()].some((rect) => rect.bottom > bottom + 1)
          ) {
            hidden = true;
            break;
          }
        }
      }
      probe.remove();
      setOverflows(hidden);
      if (!hidden) setExpanded(false);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(source);
    const mutations = new MutationObserver(measure);
    mutations.observe(source, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.fonts?.ready.then(measure);
    return () => {
      active = false;
      resize.disconnect();
      mutations.disconnect();
    };
  }, [value, className]);
  if (!value) return null;
  return (
    <section
      ref={section}
      className={`description-accordion ${className} ${expanded || !overflows ? "is-expanded" : "is-collapsed"}`}
      aria-label={label}
    >
      {overflows && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {t(expanded ? "Collapse" : "Expand")}
        </button>
      )}
      <div
        ref={content}
        id={id}
        className={`description-accordion-content ${className}-content`}
      >
        <Description value={value} />
      </div>
    </section>
  );
}
