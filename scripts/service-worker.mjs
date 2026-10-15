import { createHash } from "node:crypto";
// Only the public application shell is cached. API/session responses never are.
export class ServiceWorkerPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("ServiceWorkerPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "ServiceWorkerPlugin",
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          const assets = Object.keys(compilation.assets).filter((name) =>
            /\.(js|css|svg|png|webp|woff2?)$/.test(name),
          );
          const version = createHash("sha256")
            .update(
              assets.join("|") + compilation.assets["index.html"].source(),
            )
            .digest("hex")
            .slice(0, 16);
          const source = `const CACHE='todo-shell-${version}';
const ASSETS=${JSON.stringify(["/", ...assets.map((name) => "/" + name)])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('todo-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/sw.js')return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/'))));return;
 }
 if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(event.request)));
});`;
          compilation.emitAsset(
            "sw.js",
            new compiler.webpack.sources.RawSource(source),
          );
        },
      );
    });
  }
}
