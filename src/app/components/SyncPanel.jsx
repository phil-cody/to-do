import React, { useState } from "react";
import { normalize } from "../model.js";
import { importLocalSnapshot } from "../sync/merge.js";
export default function SyncPanel({ workspace }) {
  const { repository, sync, data } = workspace;
  const [settings, setSettings] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!repository.remote || !repository.user) return null;
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
    const draft = await repository.exportDraft(),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(draft, null, 2)], {
          type: "application/json",
        }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "todo_app.backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          <label>
            Часовой пояс
            <input
              required
              list="timezones"
              value={settings.timezone}
              onChange={(e) =>
                setSettings({ ...settings, timezone: e.target.value })
              }
            />
            <datalist id="timezones">
              {[
                "Europe/Moscow",
                "Asia/Ho_Chi_Minh",
                Intl.DateTimeFormat().resolvedOptions().timeZone,
                "UTC",
              ]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((zone) => (
                  <option key={zone} value={zone} />
                ))}
            </datalist>
          </label>
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
              onClick={() =>
                action(async () => {
                  if (
                    !confirm(
                      "Перенести локальные проекты и задачи в этот аккаунт? Исходные данные останутся в localStorage. Повторный импорт создаст новые копии.",
                    )
                  )
                    return;
                  const raw = localStorage.getItem("todo_app");
                  if (!raw)
                    throw new Error("На этом адресе нет локальных задач.");
                  const next = importLocalSnapshot(
                    data,
                    normalize(JSON.parse(raw)),
                  );
                  await repository.save(next, data);
                })
              }
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
