import { messages } from "./i18n-messages.js";
export const languages = ["en", "ru"];
export const validLanguage = (value) => languages.includes(value);
export const accountLanguage = (settings) =>
  validLanguage(settings?.language) ? settings.language : "ru";
const aliases = new Map(
  Object.entries(messages).flatMap(([en, ru]) => [
    [en, en],
    [ru, en],
  ]),
);
const patterns = [];
for (const [en, ru] of Object.entries(messages)) {
  for (const source of [en, ru]) {
    if (!source.includes("{")) continue;
    const names = [];
    const pattern = source
      .split(/(\{\w+\})/g)
      .map((part) => {
        if (/^\{\w+\}$/.test(part)) {
          names.push(part.slice(1, -1));
          return ["index", "count", "number", "done", "limit"].includes(
            part.slice(1, -1),
          )
            ? "(\\d+)"
            : "([\\s\\S]*?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    patterns.push({ match: new RegExp(`^${pattern}$`), en, names });
  }
}
// Pure translation is also used by the server, always with an explicit locale.
export function translate(source, language = "en", values = {}) {
  if (typeof source !== "string") return source;
  let key = aliases.get(source),
    params = values;
  if (!key)
    for (const entry of patterns) {
      const result = source.match(entry.match);
      if (result) {
        key = entry.en;
        params = {
          ...Object.fromEntries(
            entry.names.map((name, index) => [name, result[index + 1]]),
          ),
          ...values,
        };
        break;
      }
    }
  const result = language === "ru" ? messages[key] || source : key || source;
  return result.replace(/\{(\w+)\}/g, (token, name) =>
    ["where", "message"].includes(name) &&
    Object.hasOwn(params, name) &&
    params[name] !== source
      ? translate(params[name] ?? token, language)
      : String(params[name] ?? token),
  );
}
let language = "en";
try {
  const saved = globalThis.localStorage?.getItem("todo_language");
  language = validLanguage(saved)
    ? saved
    : globalThis.navigator?.language?.startsWith("ru")
      ? "ru"
      : "en";
} catch {
  /* The interface still works when storage is unavailable. */
}
const listeners = new Set();
export const getLanguage = () => language;
export const t = (source, values) => translate(source, language, values);
export function setLanguage(next) {
  if (!validLanguage(next)) return;
  const changed = next !== language;
  language = next;
  if (globalThis.document) document.documentElement.lang = next;
  try {
    globalThis.localStorage?.setItem("todo_language", next);
  } catch {
    /* No persistent preference in private/limited storage. */
  }
  if (changed) for (const listener of listeners) listener();
}
export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === "todo_language" && validLanguage(event.newValue))
      setLanguage(event.newValue);
  });
