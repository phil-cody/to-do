import React, { lazy, Suspense } from "react";
import rehypeSanitize from "rehype-sanitize";
import { markdownComponents } from "../markdown.jsx";
export const MDEditor = lazy(() => import("@uiw/react-md-editor/nohighlight"));
const Markdown = lazy(() =>
  import("@uiw/react-md-editor/nohighlight").then((m) => ({
    default: m.default.Markdown,
  })),
);
export default function Description({ value }) {
  return (
    <Suspense fallback={<p className="muted">Loading description…</p>}>
      <Markdown
        source={value || ""}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      />
    </Suspense>
  );
}
