import { t } from "./i18n.js";
import TelegramLogin from "./components/TelegramLogin.jsx";
import SyncPanel from "./components/SyncPanel.jsx";
import React, { useEffect } from "react";
import useWorkspace from "./hooks/useWorkspace.js";
import useDay from "./hooks/useDay.js";
import useLanguage from "./hooks/useLanguage.js";
import useMediaQuery from "./hooks/useMediaQuery.js";
import { MOBILE_QUERY, COMPACT_QUERY } from "./constants.js";
import { selectDashboard } from "./selectors.js";
import { BusyContext } from "./components/Select.jsx";
import Header, { MobileActions } from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { SidebarDrawer } from "./components/Modal.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ProjectCard from "./components/ProjectCard.jsx";
import TaskCard from "./components/TaskCard.jsx";
import WorkspaceModal from "./components/WorkspaceModal.jsx";

export default function App() {
  useLanguage();
  const workspace = useWorkspace(),
    day = useDay();
  const mobile = useMediaQuery(MOBILE_QUERY),
    compact = useMediaQuery(COMPACT_QUERY);
  useEffect(() => {
    if (!mobile) workspace.setSidebarOpen(false);
  }, [mobile, workspace.setSidebarOpen]);
  if (workspace.authentication)
    return <TelegramLogin onComplete={workspace.reload} />;
  if (!workspace.data)
    return (
      <div className="loading">
        <h1>
          JUST <span>to</span> DO IT
        </h1>
        {workspace.error ? (
          <>
            <p role="alert">{t(workspace.error)}</p>
            <button onClick={workspace.reload}>{t("Try again")}</button>
          </>
        ) : (
          <p>{t("Loading your workspace…")}</p>
        )}
      </div>
    );
  const board = selectDashboard(workspace.data, {
    compact,
    search: workspace.search,
    day,
  });
  const renderProject = (project) => (
    <ProjectCard
      key={project.project_id}
      project={project}
      projectCount={board.projects.length}
      busy={workspace.busy}
      onChoose={workspace.chooseProject}
      onPin={workspace.pinProject}
      onEdit={workspace.editProject}
      onDelete={workspace.deleteProject}
    />
  );
  const renderTask = (task, { dragHandleProps } = {}) => (
    <TaskCard
      key={task.task_id}
      task={task}
      dragHandleProps={dragHandleProps}
      isAll={board.isAll}
      draggable={board.view === "kanban"}
      busy={workspace.busy}
      projectTitle={board.projectTitles.get(task.task_project)}
      onChoose={workspace.chooseProject}
      onUpdate={workspace.updateTask}
      onEdit={workspace.editTask}
      onShow={workspace.showTask}
      onDelete={workspace.deleteTask}
    />
  );
  const sidebar = (
    <Sidebar
      projects={board.projects}
      selected={board.selected}
      isAll={board.isAll}
      taskCount={board.allTasks.length}
      busy={workspace.busy}
      onChoose={workspace.chooseProject}
      onPin={workspace.pinProject}
      onDeleteProject={workspace.deleteProject}
      onAddProject={workspace.addProject}
      onEditProject={workspace.editProject}
      onShowProjects={workspace.showProjects}
    />
  );
  return (
    <BusyContext.Provider value={workspace.busy}>
      <div className="app-shell" data-color-mode="light">
        <Header
          mobile={mobile}
          onShowAll={() => workspace.chooseProject("all")}
          onAddProject={workspace.addProject}
          onAddTask={workspace.addTask}
        />
        {workspace.error && !workspace.modal && (
          <div className="error" role="alert">
            {t(workspace.error)}
            <button onClick={workspace.dismissError}>{t("Dismiss")}</button>
          </div>
        )}
        <div className="workspace" aria-busy={workspace.busy}>
          {mobile ? (
            <SidebarDrawer
              open={workspace.sidebarOpen}
              onClose={() => workspace.setSidebarOpen(false)}
            >
              {sidebar}
            </SidebarDrawer>
          ) : (
            sidebar
          )}
          <main>
            {mobile && (
              <MobileActions
                open={workspace.sidebarOpen}
                onToggleMenu={() => workspace.setSidebarOpen(true)}
                onAddProject={workspace.addProject}
                onAddTask={workspace.addTask}
              />
            )}
            <SyncPanel workspace={workspace} />
            <Dashboard
              {...board}
              compact={compact}
              busy={workspace.busy}
              day={day}
              projectId={workspace.data.selectedProjectId}
              search={workspace.search}
              onSearch={workspace.setSearch}
              onPreference={workspace.preference}
              onShowProjects={workspace.showProjects}
              onAddTask={workspace.addTask}
              onUpdateTask={workspace.updateTask}
              renderProject={renderProject}
              renderTask={renderTask}
            />
          </main>
        </div>
        <WorkspaceModal
          workspace={workspace}
          projects={board.projects}
          allTasks={board.allTasks}
          renderProject={renderProject}
        />
      </div>
    </BusyContext.Provider>
  );
}
