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
  // Publish a snapshot only after persistence succeeds. Failed writes preserve
  // the previous workspace and the editor's unsaved draft.
  async function commit(update, close = false) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const next = update(data);
      const saved = await repository.save(next, data);
      setData(saved || next);
      setSync(repository.status || { local: true });
      if (close) setModal(null);
      return true;
    } catch (error) {
      setError(`Changes could not be saved: ${error.message}`);
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function openModal(value) {
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
    if (window.confirm(`Delete “${task.task_title}”?`))
      return commit((data) => removeTask(data, task.task_id), true);
  }
  function deleteProject(project) {
    if (
      window.confirm(
        `Delete “${project.project_title}” and its ${project.todoList.length} tasks?`,
      )
    )
      return commit((data) => removeProject(data, project.project_id), true);
  }
  return {
    data,
    repository,
    sync,
    authentication,
    error,
    busy,
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
      commit((data) => toggleProjectPin(data, project.project_id)),
    updateTask: (task, changes) =>
      commit((data) => upsertTask(data, { ...task, ...changes })),
    preference: (key, value) =>
      commit((data) => setPreference(data, key, value)),
    saveEditor: (item) =>
      commit((data) => {
        const saved = saveItem(data, modal.kind, item);
        return modal.selectOnSave
          ? { ...saved, selectedProjectId: item.task_project }
          : saved;
      }, true),
  };
}
