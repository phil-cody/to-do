import { attachmentBytes } from "../attachments.js";
import { t } from "../i18n.js";
import { useEffect, useRef, useState } from "react";
import { createRepository } from "../repository.js";
import { appendProjectImport } from "../import-project.js";
import { orderedProjects, upsertTask } from "../model.js";
import {
  newTask,
  newProject,
  setPreference,
  toggleProjectPin,
  removeTask,
  removeProject,
  saveItem,
} from "../workspace.js";

export default function useWorkspace() {
  const [repository] = useState(createRepository);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [activity, setActivity] = useState("Saving…"),
    [optimisticData, setOptimisticData] = useState(null),
    [modal, setModal] = useState(null),
    [search, setSearch] = useState(""),
    [sidebarOpen, setSidebarOpen] = useState(false);
  const saving = useRef(false);
  const [sync, setSync] = useState({ local: !repository.remote });
  const [authentication, setAuthentication] = useState(false);
  useEffect(() => {
    if (!data || !repository.subscribe) return;
    return repository.subscribe((snapshot, status) => {
      setSync(status);
      if (status.authentication) {
        setAuthentication(true);
        setData(null);
      } else if (snapshot) setData(snapshot);
    });
  }, [repository, Boolean(data)]);
  useEffect(() => {
    let active = true;
    repository
      .load()
      .then((snapshot) => {
        if (active) {
          setData(snapshot);
          setSync(repository.status || { local: true });
          setAuthentication(false);
        }
      })
      .catch((error) => {
        if (active) {
          setError(error.message);
          setAuthentication(!!error.authentication);
        }
      });
    return () => {
      active = false;
    };
  }, [repository]);
  useEffect(() => {
    if (!data || authentication) return;
    const openFromLink = () => {
      if (window.location.hash !== "#new-task") return;
      const project =
        data.projects.find((project) => project.project_type === "inbox") ||
        orderedProjects(data.projects)[0];
      openModal({
        kind: "task",
        item: newTask(project.project_id),
        selectOnSave: true,
      });
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    };
    openFromLink();
    window.addEventListener("hashchange", openFromLink);
    return () => window.removeEventListener("hashchange", openFromLink);
  }, [data, authentication]);
  async function reload() {
    setError("");
    try {
      setData(await repository.load());
      setSync(repository.status || { local: true });
      setAuthentication(false);
    } catch (error) {
      setError(error.message);
      setAuthentication(!!error.authentication);
    }
  }
  // Быстрые действия отображаются сразу. Формы сохраняют черновик до подтверждения.
  async function commit(update, close = false, optimistic = false) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setActivity("Saving…");
    setError("");
    try {
      const next = update(data);
      if (optimistic) setOptimisticData(next);
      const saved = await repository.save(next, data);
      setData(saved || next);
      setSync(repository.status || { local: true });
      if (close) setModal(null);
      return true;
    } catch (error) {
      setError(
        t("Changes could not be saved: {message}", {
          message: t(error.message),
        }),
      );
      return false;
    } finally {
      saving.current = false;
      setOptimisticData(null);
      setBusy(false);
    }
  }
  function openModal(value) {
    if (saving.current) return;
    setSidebarOpen(false);
    setModal(value);
  }
  const editTask = (task) => openModal({ kind: "task", item: task });
  const editProject = (project) =>
    openModal({ kind: "project", item: project });
  async function chooseProject(id) {
    setSearch("");
    if (await commit((data) => ({ ...data, selectedProjectId: id }), true))
      setSidebarOpen(false);
  }
  function deleteTask(task) {
    if (window.confirm(t("Delete “{title}”?", { title: task.task_title })))
      return commit((data) => removeTask(data, task.task_id), true, true);
  }
  function deleteProject(project) {
    if (
      window.confirm(
        t("Delete “{title}” and its {count} tasks?", {
          title: project.project_title,
          count: project.todoList.length,
        }),
      )
    )
      return commit(
        (data) => removeProject(data, project.project_id),
        true,
        true,
      );
  }
  return {
    data: optimisticData || data,
    repository,
    sync,
    authentication,
    error,
    busy,
    activity,
    performAction: async (action, label) => {
      if (saving.current) return false;
      saving.current = true;
      setBusy(true);
      setActivity(label);
      try {
        await action();
        return true;
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    modal,
    search,
    sidebarOpen,
    reload,
    setSearch,
    setSidebarOpen,
    dismissError: () => setError(""),
    closeModal: () => {
      if (!saving.current) setModal(null);
    },
    showProjects: () => openModal({ kind: "projects" }),
    showImport: () => openModal({ kind: "import" }),
    importProjects: async (imported) => {
      const saved = await commit(
        (current) => appendProjectImport(current, imported),
        true,
      );
      if (saved) setSearch("");
      return saved;
    },
    showTask: (task) => openModal({ kind: "details", id: task.task_id }),
    addTask: () =>
      openModal({
        kind: "task",
        item: newTask(
          data.selectedProjectId === "all"
            ? orderedProjects(data.projects)[0].project_id
            : data.selectedProjectId,
        ),
      }),
    addProject: () =>
      openModal({ kind: "project", item: newProject(data.projects) }),
    editTask,
    editProject,
    chooseProject,
    deleteTask,
    deleteProject,
    pinProject: (project) =>
      commit((data) => toggleProjectPin(data, project.project_id), false, true),
    updateTask: (task, changes) =>
      commit((data) => upsertTask(data, { ...task, ...changes }), false, true),
    preference: (key, value) =>
      commit((data) => setPreference(data, key, value), false, true),
    downloadAttachment: async (file) => {
      if (saving.current) return;
      saving.current = true;
      setBusy(true);
      setActivity("Preparing file…");
      setError("");
      try {
        const record = await repository.attachment(file);
        const url = URL.createObjectURL(
          new Blob([attachmentBytes(record.data)], {
            type: "application/octet-stream",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        setError(t(error.message));
      } finally {
        saving.current = false;
        setBusy(false);
      }
    },
    saveEditor: (item) =>
      commit((data) => {
        const saved = saveItem(data, modal.kind, item);
        return modal.selectOnSave
          ? { ...saved, selectedProjectId: item.task_project }
          : saved;
      }, true),
  };
}
