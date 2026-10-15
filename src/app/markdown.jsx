import { t } from "./i18n.js";
// Sanitization removes executable HTML; these components additionally avoid
// unsolicited network requests and referrer disclosure from Markdown content.
import React from "react";
export const markdownComponents = {
  img: ({ src, alt }) =>
    src ? (
      <a href={src} target="_blank" rel="noopener noreferrer">
        {t("View image")}
        {alt ? `: ${alt}` : ""}
      </a>
    ) : null,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};
