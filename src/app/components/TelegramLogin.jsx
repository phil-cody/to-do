import { getLanguage, t } from "../i18n.js";
import React, { useEffect, useState } from "react";
export default function TelegramLogin({ onComplete }) {
  const [challenge, setChallenge] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!challenge) return;
    let active = true;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const response = await fetch("/api/auth/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": getLanguage(),
          },
          body: JSON.stringify({ id: challenge.id }),
          signal: controller.signal,
        });
        if (response.status === 202) return;
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) {
          setChallenge(null);
          onComplete();
        }
      } catch (error) {
        if (active) {
          setError(error.message);
          setChallenge(null);
        }
      }
    };
    const timer = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
    };
  }, [challenge, onComplete]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": getLanguage(),
          },
          body: "{}",
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setChallenge(result);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="loading login-panel">
      <h1>
        JUST <span>to</span> DO IT
      </h1>
      <h2>{t("Sign in with Telegram")}</h2>
      <p>
        {t(
          "Each user has separate projects and tasks. Confirm sign-in in @just_to_do_it_bot and return to this page.",
        )}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {challenge ? (
        <>
          <a
            className="telegram-link"
            href={challenge.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Open Telegram and confirm sign-in")}
          </a>
          <p>{t("Waiting for confirmation. The link expires in 5 minutes.")}</p>
        </>
      ) : (
        <button className="primary" disabled={busy} onClick={start}>
          {busy ? t("Preparing sign-in…") : t("Sign in")}
        </button>
      )}
    </section>
  );
}
