export function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator))
    return;
  window.addEventListener(
    "load",
    () => {
      // Обновлённый worker активируется после закрытия старых вкладок.
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Сбой кеширования не блокирует обычную работу через сеть.
      });
    },
    { once: true },
  );
}
