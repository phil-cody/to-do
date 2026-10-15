import React, { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <p className="date" aria-label="Current date and time">
      <span className="date__day">
        {new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }).format(now)}
      </span>
      <time className="date__time" dateTime={now.toISOString()}>
        {new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(now)}
      </time>
    </p>
  );
}

export function AddActions({ onAddProject, onAddTask }) {
  return (
    <>
      <button aria-label="+ Add Project" onClick={onAddProject}>
        <Icon name="plus" />
        <span>Add Project</span>
      </button>
      <button className="primary" aria-label="+ Add Task" onClick={onAddTask}>
        <Icon name="plus" />
        <span>Add Task</span>
      </button>
    </>
  );
}
export function MobileActions({ open, onToggleMenu, onAddProject, onAddTask }) {
  return (
    <div
      className="main-navigation mobile-actions"
      role="group"
      aria-label="Workspace actions"
    >
      <button
        className="menu-toggle"
        aria-label="Open project menu"
        aria-controls="project-sidebar"
        aria-expanded={open}
        onClick={onToggleMenu}
      >
        <Icon name="menu" />
        <span>Projects</span>
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
