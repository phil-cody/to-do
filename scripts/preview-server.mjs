import { createStaticServer } from "./lib/static-server.mjs";

const port = Number(process.argv[2] || 4002);
createStaticServer({ root: "dist", port }).listen(port, "127.0.0.1", () =>
  console.log(`Production preview: http://localhost:${port}`),
);
