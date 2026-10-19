import { normalize } from "../model.js";
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function flatten(snapshot) {
  const projects = Object.create(null),
    tasks = Object.create(null);
  for (const project of snapshot.projects) {
    const { todoList, ...fields } = project;
    projects[project.project_id] = fields;
    for (const task of todoList) tasks[task.task_id] = task;
  }
  return {
    preferences: {
      allView: snapshot.allView,
      allFilter: snapshot.allFilter,
    },
    projects,
    tasks,
  };
}
export class MergeConflict extends Error {
  constructor(paths) {
    super(
      "Одни и те же данные изменены на разных устройствах. Выберите, какие изменения сохранить.",
    );
    this.paths = paths;
  }
}
// Merge only fields changed by this edit; unrelated server fields survive.
export function mergeEdit(base, next, remote, { force = false } = {}) {
  const before = flatten(base),
    after = flatten(next),
    result = flatten(remote),
    conflicts = [];
  for (const type of ["projects", "tasks"]) {
    for (const id of new Set([
      ...Object.keys(before[type]),
      ...Object.keys(after[type]),
    ])) {
      const old = before[type][id],
        mine = after[type][id],
        theirs = result[type][id];
      if (same(old, mine)) continue;
      if (!mine) {
        if (theirs && !same(old, theirs) && !force)
          conflicts.push(`${type}/${id}`);
        else delete result[type][id];
      } else if (!old) {
        if (theirs && !same(mine, theirs) && !force)
          conflicts.push(`${type}/${id}`);
        else result[type][id] = structuredClone(mine);
      } else if (!theirs) {
        if (!force) conflicts.push(`${type}/${id}`);
        else result[type][id] = structuredClone(mine);
      } else {
        const merged = { ...theirs };
        for (const field of new Set([
          ...Object.keys(old),
          ...Object.keys(mine),
        ]))
          if (!same(old[field], mine[field])) {
            if (
              !same(theirs[field], old[field]) &&
              !same(theirs[field], mine[field]) &&
              !force
            )
              conflicts.push(`${type}/${id}/${field}`);
            else if (mine[field] === undefined) delete merged[field];
            else merged[field] = structuredClone(mine[field]);
          }
        result[type][id] = merged;
      }
    }
  }
  for (const key of Object.keys(after.preferences))
    if (!same(before.preferences[key], after.preferences[key])) {
      // View/selection preferences never block task synchronization.
      result.preferences[key] = after.preferences[key];
    }
  for (const [id, task] of Object.entries(result.tasks))
    if (!result.projects[task.task_project]) {
      if (force) delete result.tasks[id];
      else conflicts.push(`tasks/${id}/task_project`);
    }
  if (conflicts.length) throw new MergeConflict(conflicts);
  if (!Object.keys(result.projects).length)
    throw new MergeConflict(["projects"]);
  return normalize({
    ...result.preferences,
    selectedProjectId: remote.selectedProjectId,
    projects: Object.values(result.projects).map((p) => ({
      ...p,
      todoList: Object.values(result.tasks).filter(
        (t) => t.task_project === p.project_id,
      ),
    })),
  });
}
export function pendingSnapshot(state) {
  let snapshot = state.remote;
  for (const edit of state.queue)
    snapshot = mergeEdit(edit.base, edit.next, snapshot, { force: true });
  if (state.selectedProjectId === undefined) return snapshot;
  return {
    ...snapshot,
    selectedProjectId:
      state.selectedProjectId === "all" ||
      snapshot.projects.some(
        (project) => project.project_id === state.selectedProjectId,
      )
        ? state.selectedProjectId
        : "all",
  };
}
