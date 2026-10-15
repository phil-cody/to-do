import { t } from "../i18n.js";
import React, { lazy, Suspense } from "react";
import rehypeSanitize from "rehype-sanitize";
import { markdownComponents } from "../markdown.jsx";
function localizeCommand(command) {
  const buttonProps = { ...command.buttonProps };
  for (const key of ["aria-label", "title"])
    if (buttonProps[key]) buttonProps[key] = t(buttonProps[key]);
  return {
    ...command,
    buttonProps,
    ...(command.children
      ? { children: command.children.map(localizeCommand) }
      : {}),
  };
}
export const MDEditor = lazy(() =>
  import("@uiw/react-md-editor/nohighlight").then((module) => ({
    default: function LocalizedEditor(props) {
      const Editor = module.default;
      return (
        <Editor
          {...props}
          commands={module.commands.getCommands().map(localizeCommand)}
          extraCommands={module.commands
            .getExtraCommands()
            .map(localizeCommand)}
        />
      );
    },
  })),
);
const Markdown = lazy(() =>
  import("@uiw/react-md-editor/nohighlight").then((m) => ({
    default: m.default.Markdown,
  })),
);
export default function Description({ value }) {
  return (
    <Suspense fallback={<p className="muted">{t("Loading description…")}</p>}>
      <Markdown
        source={value || ""}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      />
    </Suspense>
  );
}
