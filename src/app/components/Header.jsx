import { getLanguage, t } from "../i18n.js";
import React, { useEffect, useState, useContext } from "react";
import { BusyContext } from "./Select.jsx";
import Icon from "./Icon.jsx";
function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <p className="date" aria-label={t("Current date and time")}>
      <span className="date__day">
        {new Intl.DateTimeFormat(getLanguage() === "ru" ? "ru-RU" : "en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }).format(now)}
      </span>
      <time className="date__time" dateTime={now.toISOString()}>
        {new Intl.DateTimeFormat(getLanguage() === "ru" ? "ru-RU" : "en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: getLanguage() !== "ru",
        }).format(now)}
      </time>
    </p>
  );
}

export function AddActions({ onAddProject, onAddTask }) {
  const busy = useContext(BusyContext);
  return (
    <>
      <button
        disabled={busy}
        aria-label={t("+ Add Project")}
        onClick={onAddProject}
      >
        <Icon name="plus" />
        <span>{t("Add Project")}</span>
      </button>
      <button
        className="primary"
        disabled={busy}
        aria-label={t("+ Add Task")}
        onClick={onAddTask}
      >
        <Icon name="plus" />
        <span>{t("Add Task")}</span>
      </button>
    </>
  );
}
export function MobileActions({ open, onToggleMenu, onAddProject, onAddTask }) {
  return (
    <div
      className="main-navigation mobile-actions"
      role="group"
      aria-label={t("Workspace actions")}
    >
      <button
        className="menu-toggle"
        aria-label={t("Open project menu")}
        aria-controls="project-sidebar"
        aria-expanded={open}
        onClick={onToggleMenu}
      >
        <Icon name="menu" />
        <span>{t("Projects")}</span>
      </button>
      <AddActions onAddProject={onAddProject} onAddTask={onAddTask} />
    </div>
  );
}
export default function Header({ mobile, onShowAll, onAddProject, onAddTask }) {
  return (
    <header className="header">
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onShowAll();
        }}
      >
        JUST <span>to</span> DO IT
      </a>
      {!mobile && (
        <div className="header-actions">
          <AddActions onAddProject={onAddProject} onAddTask={onAddTask} />
        </div>
      )}
      <HeaderClock />
    </header>
  );
}
