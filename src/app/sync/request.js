// Ограничение ожидания HTTP-ответа; SSE-подключения этим помощником не обслуживаются.
export async function requestWithTimeout(
  request,
  url,
  options = {},
  timeout = 20000,
) {
  const controller = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal;
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, timeout);
  try {
    return await request(url, { ...options, signal });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const failure = new Error(
      expired
        ? "The server took too long to respond. Try again."
        : "Could not reach the server. Try again.",
    );
    failure.network = true;
    throw failure;
  } finally {
    clearTimeout(timer);
  }
}
