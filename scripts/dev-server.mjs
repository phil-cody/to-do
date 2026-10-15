import path from "node:path";
import { createStaticServer } from "./lib/static-server.mjs";
import webpack from "webpack";
import makeConfig from "../webpack.config.js";
const port = Number(process.argv[2] || 4000);
const config = makeConfig({}, { mode: "development" });
config.mode = "development";
// Keep development output separate from the deployable production build.
config.output.path = path.resolve(`.cache/dev-${port}`);
const compiler = webpack(config),
  root = config.output.path;
const clients = new Set();
const server = createStaticServer({
  root,
  port,
  transformHTML: (html) =>
    html.replace("</body>", '<script src="/__dev/client.js"></script></body>'),
  route(pathname, req, res) {
    if (pathname === "/__dev/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return true;
    }
    if (pathname === "/__dev/client.js") {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(
        req.method === "HEAD"
          ? undefined
          : 'new EventSource("/__dev/events").addEventListener("build",()=>location.reload());',
      );
      return true;
    }
    return false;
  },
});
let started = false;
const watcher = compiler.watch({}, (error, stats) => {
  if (error || stats.hasErrors()) {
    console.error(error || stats.toString({ all: false, errors: true }));
    return;
  }
  console.log(stats.toString({ all: false, timings: true, warnings: true }));
  if (!started) {
    started = true;
    server.listen(port, "127.0.0.1", () =>
      console.log(`Todo: http://localhost:${port}`),
    );
  } else
    for (const client of clients) client.write("event: build\ndata: ready\n\n");
});
server.on("error", (e) => {
  console.error(e.message);
  watcher.close(() => process.exit(1));
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const client of clients) client.end();
    server.close();
    watcher.close(() => process.exit(0));
  });
