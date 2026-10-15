import { setLanguage, t } from "../i18n.js";
import React, { useState } from "react";
import TimezoneSelect from "./TimezoneSelect.jsx";
import { downloadJson } from "../files.js";
import LanguageSelect from "./LanguageSelect.jsx";
export default function SyncPanel({ workspace }) {
  const { repository, sync } = workspace;
  const [settings, setSettings] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!repository.remote || !repository.user)
    return (
      <section className="sync-panel" aria-label={t("Import data")}>
        <div className="account-actions">
          <button onClick={() => setSettings(settings ? null : {})}>
            {t("Telegram and account")}
          </button>
          <button disabled={workspace.busy} onClick={workspace.showImport}>
            {t("Import projects and tasks")}
          </button>
        </div>
        {settings && (
          <div className="account-settings">
            <LanguageSelect onChange={setLanguage} />
          </div>
        )}
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
    <section className="sync-panel" aria-label={t("Synchronization")}>
      <div className="sync-summary">
        <span>
          {repository.user.name} ·{" "}
          {sync.conflict
            ? t("Conflicting changes")
            : sync.pending
              ? t("Pending uploads: {count}", { count: sync.pending })
              : sync.online === false
                ? t("Offline")
                : t("Synced")}
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
          {t("Telegram and account")}
        </button>
        <button
          disabled={busy || workspace.busy}
          onClick={workspace.showImport}
        >
          {t("Import projects and tasks")}
        </button>
        <button
          disabled={busy}
          onClick={() => action(() => repository.flush())}
        >
          {t("Refresh")}
        </button>
      </div>
      {(error || sync.error) && <p role="alert">{t(error || sync.error)}</p>}
      {sync.conflict && (
        <div className="sync-conflict">
          <p>
            {t(
              "Some fields were also changed on another device. Other data will be preserved.",
            )}
          </p>
          <button onClick={() => action(download)}>
            {t("Download a copy of my data")}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (confirm(t("Apply my changes to the conflicting fields?")))
                void action(() => repository.resolveConflict(true));
            }}
          >
            {t("Apply my changes")}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  t(
                    "Discard all pending changes for this account and load server data? Download a copy first if needed.",
                  ),
                )
              )
                void action(() => repository.resolveConflict(false));
            }}
          >
            {t("Use server data")}
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
                await repository.updateSettings({
                  enabled: settings.enabled,
                  time: settings.time,
                  timezone: settings.timezone,
                }),
              );
            });
          }}
        >
          <LanguageSelect
            disabled={busy}
            onChange={(language) =>
              action(async () => {
                const result = await repository.updateSettings({ language });
                setSettings((current) => ({
                  ...current,
                  language: result.language,
                }));
              })
            }
          />
          <h3>{t("Daily tasks in Telegram")}</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
            />
            {t("Send today's tasks")}
          </label>
          <label>
            {t("Time")}
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
            {t("Save schedule")}
          </button>
          <p>
            {t(
              "Text messages to the bot become Inbox tasks. /today shows today's tasks; /stop disables delivery.",
            )}
          </p>
          <div className="account-actions">
            <button
              disabled={busy}
              type="button"
              onClick={workspace.showImport}
            >
              {t("Migrate local tasks")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => action(download)}
            >
              {t("Download backup")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => action(() => repository.logout())}
            >
              {t("Log out")}
            </button>
            <button type="button" onClick={() => setSettings(null)}>
              {t("Close")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
