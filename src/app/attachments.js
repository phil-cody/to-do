import { ClientStore } from "./sync/client-store.js";

export const attachmentLimits = Object.freeze({
  count: 10,
  bytes: 20 * 1024 * 1024,
  total: 200 * 1024 * 1024,
  backup: 285 * 1024 * 1024,
});
export function attachmentMetadata(files = []) {
  if (!Array.isArray(files) || files.length > attachmentLimits.count)
    throw new Error("Maximum: 10 files per task, 20 MB per file.");
  const ids = new Set();
  return files.map((file) => {
    if (
      !file ||
      typeof file.id !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.id) ||
      ids.has(file.id) ||
      typeof file.name !== "string" ||
      !file.name.trim() ||
      file.name.length > 255 ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      file.size > attachmentLimits.bytes
    )
      throw new Error("Invalid attachment.");
    ids.add(file.id);
    return { id: file.id, name: file.name, size: file.size };
  });
}
export function attachmentBytes(data) {
  if (
    typeof data !== "string" ||
    data.length > Math.ceil(attachmentLimits.bytes / 3) * 4 ||
    data.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
  )
    throw new Error("Invalid attachment.");
  let raw;
  try {
    raw = atob(data);
  } catch {
    throw new Error("Invalid attachment.");
  }
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}
export async function attachmentId(bytes) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function fileAttachment(file) {
  if (file.size > attachmentLimits.bytes)
    throw new Error("Maximum: 10 files per task, 20 MB per file.");
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
  return {
    id: await attachmentId(attachmentBytes(data)),
    name: file.name,
    size: file.size,
    data,
  };
}
export const snapshotFiles = (snapshot) =>
  snapshot.projects.flatMap((p) =>
    p.todoList.flatMap((task) => task.task_attachments || []),
  );
export function metadataSnapshot(snapshot) {
  return {
    ...snapshot,
    projects: snapshot.projects.map((p) => ({
      ...p,
      todoList: p.todoList.map((task) =>
        task.task_attachments === undefined
          ? task
          : {
              ...task,
              task_attachments: attachmentMetadata(task.task_attachments),
            },
      ),
    })),
  };
}
export class AttachmentStorage {
  constructor(store = new ClientStore()) {
    this.store = store;
  }
  key(scope, id) {
    return `attachment:${scope}:${id}`;
  }
  async prepare(snapshot, scope) {
    const next = metadataSnapshot(snapshot);
    const files = snapshotFiles(snapshot);
    if (
      files.reduce((sum, file) => sum + file.size, 0) > attachmentLimits.total
    )
      throw new Error("Attachments exceed 200 MB. Remove some files.");
    for (const file of files) {
      if (file.data === undefined) continue;
      const bytes = attachmentBytes(file.data);
      if (bytes.length !== file.size || (await attachmentId(bytes)) !== file.id)
        throw new Error("Invalid attachment.");
      await this.store.change(this.key(scope, file.id), () => ({
        data: file.data,
      }));
    }
    return next;
  }
  async read(scope, file, fetchFile) {
    let record = await this.store.read(this.key(scope, file.id));
    if (!record && fetchFile) {
      record = await fetchFile(file);
      const bytes = attachmentBytes(record.data);
      if (bytes.length !== file.size || (await attachmentId(bytes)) !== file.id)
        throw new Error("Invalid attachment.");
      await this.store.change(this.key(scope, file.id), () => record);
    }
    if (!record)
      throw new Error("File unavailable. Connect to the server and try again.");
    return record;
  }
  async export(snapshot, scope, fetchFile) {
    const copy = structuredClone(snapshot);
    for (const file of snapshotFiles(copy))
      file.data = (await this.read(scope, file, fetchFile)).data;
    return copy;
  }
}
