import React, { useState } from "react";
import TimezoneSelect from "./TimezoneSelect.jsx";
import { downloadJson } from "../files.js";
export default function SyncPanel({ workspace }) {
  const { repository, sync } = workspace;
  const [settings, setSettings] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!repository.remote || !repository.user)
    return (
      <section className="sync-panel" aria-label="Импорт данных">
        <button disabled={workspace.busy} onClick={workspace.showImport}>
          Импорт проектов и задач
        </button>
      </section>
    );
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    downloadJson(await repository.exportDraft(), "todo_app.backup.json");
  }
  return (
    <section className="sync-panel" aria-label="Синхронизация">
      <div className="sync-summary">
        <span>
          {repository.user.name} ·{" "}
          {sync.conflict
            ? "Конфликт изменений"
            : sync.pending
              ? `Ожидают отправки: ${sync.pending}`
              : sync.online === false
                ? "Офлайн"
                : "Синхронизировано"}
        </span>
        <button
          disabled={busy}
          onClick={() =>
            action(async () => {
              const me = await repository.api("/api/me");
              setSettings(me.settings);
            })
          }
        >
          Telegram и аккаунт
        </button>
        <button
          disabled={busy || workspace.busy}
          onClick={workspace.showImport}
        >
          Импорт проектов и задач
        </button>
        <button
          disabled={busy}
          onClick={() => action(() => repository.flush())}
        >
          Обновить
        </button>
      </div>
      {(error || sync.error) && <p role="alert">{error || sync.error}</p>}
      {sync.conflict && (
        <div className="sync-conflict">
          <p>
            Изменённые поля пересекаются с изменениями другого устройства.
            Остальные данные будут сохранены.
          </p>
          <button onClick={() => action(download)}>
            Скачать копию моих данных
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("Применить свои изменения в конфликтующих полях?"))
                void action(() => repository.resolveConflict(true));
            }}
          >
            Применить мои изменения
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  "Отбросить все ожидающие изменения этого аккаунта и загрузить серверные данные? Сначала сохраните копию при необходимости.",
                )
              )
                void action(() => repository.resolveConflict(false));
            }}
          >
            Использовать серверные данные
          </button>
        </div>
      )}
      {settings && (
        <form
          className="account-settings"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              setSettings(
                await repository.api("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(settings),
                }),
              );
            });
          }}
        >
          <h3>Ежедневные задачи в Telegram</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
            />
            Отправлять задачи на сегодня
          </label>
          <label>
            Время
            <input
              type="time"
              required
              value={settings.time}
              onChange={(e) =>
                setSettings({ ...settings, time: e.target.value })
              }
            />
          </label>
          <TimezoneSelect
            value={settings.timezone}
            disabled={busy}
            onChange={(timezone) => setSettings({ ...settings, timezone })}
          />
          <button disabled={busy} type="submit">
            Сохранить расписание
          </button>
          <p>
            Текстовые сообщения боту становятся задачами Inbox. /today — задачи
            на сегодня, /stop — отключить отправку.
          </p>
          <div className="account-actions">
            <button
              disabled={busy}
              type="button"
              onClick={workspace.showImport}
            >
              Перенести локальные задачи
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => action(download)}
            >
              Скачать резервную копию
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => action(() => repository.logout())}
            >
              Выйти
            </button>
            <button type="button" onClick={() => setSettings(null)}>
              Закрыть
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
