import test from "node:test";
import assert from "node:assert/strict";
import { requestWithTimeout } from "../src/app/sync/request.js";

const stalled = (_url, { signal }) =>
  new Promise((_resolve, reject) => {
    if (signal.aborted) reject(signal.reason);
    else
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
  });

test("HTTP timeout aborts a stalled request and identifies a retryable network failure", async () => {
  await assert.rejects(
    requestWithTimeout(stalled, "/api/workspace", {}, 5),
    (error) =>
      error.network &&
      error.message === "The server took too long to respond. Try again.",
  );
});
test("caller cancellation is preserved rather than replaced with a server error", async () => {
  const controller = new AbortController();
  const pending = requestWithTimeout(stalled, "/api/auth/complete", {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(pending, (error) => error === controller.signal.reason);
});
test("HTTP errors stay available to the API layer and successful requests retain their options", async () => {
  const response = new Response("rejected", { status: 400 });
  const result = await requestWithTimeout(
    async (url, options) => {
      assert.equal(url, "/api/workspace");
      assert.equal(options.credentials, "same-origin");
      assert.equal(options.redirect, "error");
      assert.equal(options.signal.aborted, false);
      return response;
    },
    "/api/workspace",
    { credentials: "same-origin", redirect: "error" },
  );
  assert.equal(result, response);
});
