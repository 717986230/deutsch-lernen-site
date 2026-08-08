// 自动生成（build.mjs），勿手改。壳网络优先；词典切片持久缓存、跨版本复用。
const V='de-b13b87d26c',DATA='de-data',KEEP=["de.b3a73960.dat","en.6723bc5b.dat"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['index.html','manifest.webmanifest','icon-192.png','icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(k=>k!==V&&k!==DATA).map(k=>caches.delete(k)));
  // 清掉旧版词典切片，只保留当前 de/en 文件（内容不变则文件名不变，天然复用）
  const dc=await caches.open(DATA),reqs=await dc.keys();
  await Promise.all(reqs.map(rq=>{const p=new URL(rq.url).pathname;if(p.endsWith('.dat')&&!KEEP.some(f=>p.endsWith(f)))return dc.delete(rq);}));
  await self.clients.claim();
})())});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin||e.request.method!=='GET')return;
  if(e.request.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('/index.html')){
    // 页面：网络优先（保证更新），断网回退缓存
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));return r;})
      .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
    return;
  }
  // 词典切片进持久缓存 DATA，其余静态资源进 V；均缓存优先，未命中回源写缓存
  const bucket=u.pathname.endsWith('.dat')?DATA:V;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok){const cp=res.clone();caches.open(bucket).then(c=>c.put(e.request,cp));}return res;})));
});
