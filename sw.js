// 自动生成（build.mjs），勿手改。页面网络优先、词典切片缓存优先。
const V='de-05e8414a76';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['index.html','manifest.webmanifest','icon-192.png','icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin||e.request.method!=='GET')return;
  if(e.request.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('/index.html')){
    // 页面：网络优先（保证更新），断网回退缓存
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));return r;})
      .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
    return;
  }
  // 词典切片与静态资源：缓存优先，未命中回源并写缓存
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(e.request,cp));}return res;})));
});
