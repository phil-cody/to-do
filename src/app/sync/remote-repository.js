import { normalize } from "../model.js";
import { HttpRepository } from "./http-repository.js";
import { ClientStore } from "./client-store.js";
import { mergeEdit, pendingSnapshot } from "./merge.js";
export class AuthenticationRequired extends Error {
  constructor() {
    super("Войдите через Telegram.");
    this.authentication = true;
  }
}
export class RemoteRepository extends HttpRepository {
  constructor(
    url,
    { store = new ClientStore(), request = (...args) => fetch(...args) } = {},
  ) {
    super(url, request);
    this.store = store;
    this.remote = true;
    this.user = null;
    this.listeners = new Set();
    this.status = { online: true, pending: 0, conflict: false };
    this.epoch = 0;
  }
  async api(url, options = {}) {
    const epoch = this.epoch;
    let response;
    try {
      response = await this.request(url, {
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        ...options,
      });
    } catch (error) {
      error.network = true;
      throw error;
    }
    if (epoch !== this.epoch) {
      const error = new Error("Account changed");
      error.cancelled = true;
      error.authentication = !this.user;
      throw error;
    }
    if (response.status === 401) {
      await this.forget();
      throw new AuthenticationRequired();
    }
    if (!response.ok) {
      const error = new Error(
        (await response.json().catch(() => null))?.error ||
          `Ошибка сервера (${response.status}).`,
      );
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
  key() {
    return `user:${this.user.id}`;
  }
  async forget(clear = false) {
    this.epoch++;
    if (clear && this.user)
      await this.store.change(this.key(), () => undefined);
    await this.store.change("active", () => undefined);
    this.user = null;
    this.events?.close();
    this.publish(null, { authentication: true, pending: 0, conflict: false });
  }
  async load() {
    this.endpoint();
    try {
      const result = await this.api(this.endpoint());
      // Keep the former snapshot contract for deployments still using an older API.
      if (!result.snapshot || !result.user) return normalize(result);
      this.user = result.user;
      await this.store.change("active", () => ({
        id: this.user.id,
        verified: Date.now(),
      }));
      const state = await this.store.change(this.key(), (old) => ({
        ...old,
        remote: normalize(result.snapshot),
        revision: result.revision,
        queue: old?.queue || [],
      }));
      await this.flush();
      return pendingSnapshot((await this.store.read(this.key())) || state);
    } catch (error) {
      if (error.authentication || (!error.network && !(error.status >= 500)))
        throw error;
      const active = await this.store.read("active");
      if (!active || Date.now() - active.verified > 7 * 86400000) throw error;
      this.user = { id: active.id, name: "Telegram" };
      const state = await this.store.read(this.key());
      if (!state) throw error;
      this.status = {
        online: false,
        pending: state.queue.length,
        conflict: false,
      };
      return pendingSnapshot(state);
    }
  }
  async save(next, base) {
    if (!this.user) return super.save(next);
    const edit = {
      id: crypto.randomUUID(),
      base: structuredClone(base),
      next: structuredClone(next),
    };
    await this.store.change(this.key(), (state) => {
      if (state.queue.length >= 500)
        throw new Error(
          "Очередь офлайн-изменений заполнена. Подключитесь к серверу.",
        );
      return { ...state, queue: [...state.queue, edit] };
    });
    this.channel?.postMessage("changed");
    try {
      await this.flush();
      // An earlier background refresh may have read the queue before this edit.
      if (
        this.user &&
        this.status.online !== false &&
        !this.status.conflict &&
        (await this.store.read(this.key()))?.queue.some(
          (item) => item.id === edit.id,
        )
      )
        await this.flush();
    } catch (error) {
      if (!error.authentication && error.status && error.status !== 409)
        await this.store.change(`user:${this.user.id}`, (state) => ({
          ...state,
          queue: state.queue.filter((item) => item.id !== edit.id),
        }));
      throw error;
    }
    const state = await this.store.read(this.key());
    return pendingSnapshot(state);
  }
  publish(snapshot, status = {}) {
    this.status = {
      ...this.status,
      ...status,
      ...(snapshot ? { authentication: false } : {}),
    };
    for (const listener of this.listeners) listener(snapshot, this.status);
  }
  async flush() {
    if (!this.user) return;
    if (this.flushing) return this.flushing;
    const epoch = this.epoch,
      userId = this.user.id,
      key = this.key();
    const change = (update) =>
      this.store.change(key, (current) =>
        epoch === this.epoch ? update(current) : undefined,
      );
    const work = async () => {
      if (epoch !== this.epoch) return;
      try {
        let remote = await this.api(this.endpoint());
        if (!remote.snapshot) return;
        if (epoch !== this.epoch) return;
        if (remote.user?.id === this.user?.id) {
          this.user = remote.user;
          await this.store.change("active", (active) =>
            epoch === this.epoch && active?.id === userId
              ? { id: userId, verified: Date.now() }
              : active,
          );
        }
        let state = await change((current) => ({
          ...current,
          remote: normalize(remote.snapshot),
          revision: remote.revision,
          queue: current?.queue || [],
        }));
        let retries = 0;
        while (state?.queue.length) {
          const edit = state.queue[0];
          const operation = await this.api(
            `/api/operations/${encodeURIComponent(edit.id)}`,
          );
          if (operation.applied) {
            state = await change((current) => ({
              ...current,
              queue: current.queue.filter((item) => item.id !== edit.id),
            }));
            continue;
          }
          let snapshot;
          try {
            snapshot = mergeEdit(edit.base, edit.next, state.remote, {
              force: edit.force,
            });
          } catch (error) {
            if (!error.paths) throw error;
            if (epoch !== this.epoch) return;
            this.publish(pendingSnapshot(state), {
              online: true,
              pending: state.queue.length,
              conflict: true,
              paths: error.paths,
            });
            return;
          }
          try {
            remote = await this.api(this.endpoint(), {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "If-Match": `"${state.revision}"`,
                "X-Operation-ID": edit.id,
              },
              body: JSON.stringify(snapshot),
            });
            state = await change((current) => ({
              ...current,
              remote: normalize(remote.snapshot),
              revision: remote.revision,
              queue: current.queue.filter((item) => item.id !== edit.id),
            }));
            this.channel?.postMessage("changed");
            retries = 0;
          } catch (error) {
            if (error.status === 409 && ++retries <= 5) {
              remote = await this.api(this.endpoint());
              state = await change((current) => ({
                ...current,
                remote: normalize(remote.snapshot),
                revision: remote.revision,
              }));
              continue;
            }
            throw error;
          }
        }
        if (epoch !== this.epoch) return;
        this.publish(pendingSnapshot(state), {
          online: true,
          pending: 0,
          conflict: false,
          error: null,
        });
      } catch (error) {
        if (error.authentication) throw error;
        if (epoch !== this.epoch) return;
        const state = await this.store.read(key);
        this.publish(state ? pendingSnapshot(state) : null, {
          online: !error.network,
          pending: state?.queue.length || 0,
          error: !error.network ? error.message : null,
        });
        if (!error.network && !(error.status >= 500)) throw error;
      }
    };
    this.flushing = (
      globalThis.navigator?.locks
        ? globalThis.navigator.locks.request(`todo-sync:${this.user.id}`, work)
        : work()
    ).finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    const refresh = () => {
      void this.flush().catch((error) =>
        this.publish(null, {
          error: error.message,
          authentication: !!error.authentication,
        }),
      );
    };
    if (this.user) {
      this.channel =
        typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel(`todo-sync:${this.user.id}`)
          : null;
      if (this.channel) this.channel.onmessage = refresh;
      this.events = new EventSource("/api/events");
      this.events.addEventListener("revision", refresh);
      this.timer = setInterval(refresh, 15000);
      window.addEventListener("online", refresh);
      document.addEventListener("visibilitychange", refresh);
    }
    return () => {
      this.listeners.delete(listener);
      this.channel?.close();
      this.events?.close();
      clearInterval(this.timer);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }
  async resolveConflict(force) {
    await this.store.change(this.key(), (state) => ({
      ...state,
      queue: force ? state.queue.map((edit) => ({ ...edit, force: true })) : [],
    }));
    this.channel?.postMessage("changed");
    await this.flush();
  }
  async logout() {
    const state = await this.store.read(this.key());
    if (state?.queue.length)
      throw new Error(
        "Сначала синхронизируйте изменения или сохраните их копию.",
      );
    await this.api("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    await this.forget(true);
  }
  async exportDraft() {
    return pendingSnapshot(await this.store.read(this.key()));
  }
}
