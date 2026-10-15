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
          headers: { "Content-Type": "application/json" },
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
          headers: { "Content-Type": "application/json" },
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
      <h2>Вход через Telegram</h2>
      <p>
        Каждый пользователь получает отдельные проекты и задачи. Подтвердите
        вход в @just_to_do_it_bot и вернитесь на эту страницу.
      </p>
      {error && <p role="alert">{error}</p>}
      {challenge ? (
        <>
          <a
            className="telegram-link"
            href={challenge.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть Telegram и подтвердить вход
          </a>
          <p>Ожидаем подтверждение. Ссылка действует 5 минут.</p>
        </>
      ) : (
        <button className="primary" disabled={busy} onClick={start}>
          {busy ? "Подготовка входа…" : "Войти через Telegram"}
        </button>
      )}
    </section>
  );
}
