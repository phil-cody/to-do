import { t } from "../i18n.js";
import React from "react";
import Modal from "./Modal.jsx";
import ImportForm from "./ImportForm.jsx";
import EditorForm from "./EditorForm.jsx";
import TaskDetails from "./TaskDetails.jsx";
export default function WorkspaceModal({
  workspace,
  projects,
  allTasks,
  renderProject,
}) {
  const { modal, busy, error } = workspace;
  if (!modal) return null;
  const detail =
    modal.kind === "details"
      ? allTasks.find((task) => task.task_id === modal.id)
      : null;
  const existing =
    modal.kind === "task"
      ? allTasks.some((task) => task.task_id === modal.item?.task_id)
      : projects.some(
          (project) => project.project_id === modal.item?.project_id,
        );
  const title =
    modal.kind === "import"
      ? t("Import projects and tasks")
      : modal.kind === "projects"
        ? t("Project dashboard")
        : modal.kind === "details"
          ? detail?.task_title || t("Task")
          : t(
              modal.kind === "task"
                ? existing
                  ? "Edit task"
                  : "New task"
                : existing
                  ? "Edit project"
                  : "New project",
            );
  return (
    <Modal title={title} onClose={workspace.closeModal}>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {modal.kind === "import" && (
        <ImportForm
          busy={busy}
          remote={workspace.repository.remote}
          onImport={workspace.importProjects}
          exportData={() =>
            workspace.repository.exportDraft
              ? workspace.repository.exportDraft()
              : Promise.resolve(workspace.data)
          }
        />
      )}
      {["task", "project"].includes(modal.kind) && (
        <EditorForm
          kind={modal.kind}
          item={modal.item}
          projects={projects}
          busy={busy}
          onSave={workspace.saveEditor}
        />
      )}
      {modal.kind === "projects" && (
        <>
          <p className="muted">
            {t("Choose a project, or pin it to keep it in the pinned group.")}
          </p>
          <div className="project-grid">{projects.map(renderProject)}</div>
          <button className="primary save" onClick={workspace.addProject}>
            {t("+ New project")}
          </button>
        </>
      )}
      {detail && (
        <TaskDetails
          task={detail}
          projects={projects}
          busy={busy}
          onUpdate={workspace.updateTask}
          onEdit={workspace.editTask}
          onDelete={workspace.deleteTask}
        />
      )}
    </Modal>
  );
}
