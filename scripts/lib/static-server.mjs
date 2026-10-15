import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// Both development and preview are loopback-only utilities, not VPS servers.
export function createStaticServer({ root, port, route, transformHTML }) {
  const directory = path.resolve(root);
  const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
  return http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
    if (
      !allowedHosts.has(req.headers.host) ||
      req.headers["sec-fetch-site"] === "cross-site"
    ) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.setHeader("Allow", "GET, HEAD");
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (route?.(pathname, req, res)) return;
    const file = path.resolve(
      directory,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (
      !file.startsWith(directory + path.sep) ||
      pathname.split("/").some((segment) => segment.startsWith("."))
    ) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      let content = await readFile(file);
      if (transformHTML && path.extname(file) === ".html")
        content = transformHTML(content.toString());
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
}
