export function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator))
    return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        const announce = () =>
          window.dispatchEvent(new CustomEvent("todo-update-available"));
        if (registration.waiting) announce();
        registration.addEventListener("updatefound", () =>
          registration.installing?.addEventListener("statechange", () => {
            if (registration.waiting && navigator.serviceWorker.controller)
              announce();
          }),
        );
        // The waiting worker activates after old tabs close; drafts are not reloaded away.
      })
      .catch(() => {
        /* First online load remains usable if caching is unavailable. */
      });
  });
}
