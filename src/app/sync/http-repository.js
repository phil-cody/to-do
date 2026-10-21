import { normalize } from "../model.js";
import { requestWithTimeout } from "./request.js";
export class HttpRepository {
  constructor(url, request = (...args) => fetch(...args)) {
    this.url = url;
    this.request = (url, options, timeout) =>
      requestWithTimeout(request, url, options, timeout);
  }
  endpoint() {
    const base = globalThis.location?.href || "http://localhost/";
    const url = new URL(this.url, base);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.origin !== new URL(base).origin ||
      url.username ||
      url.password
    )
      throw new Error("The storage API must use the same origin as this app.");
    return url.href;
  }
  async load() {
    const response = await this.request(this.endpoint(), {
      credentials: "same-origin",
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(`Could not load data (${response.status}).`);
    return normalize(await response.json());
  }
  async save(data) {
    const response = await this.request(this.endpoint(), {
      method: "PUT",
      credentials: "same-origin",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error(`Could not save data (${response.status}).`);
  }
}
