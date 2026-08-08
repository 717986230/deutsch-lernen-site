// 自动生成（gen-sw.mjs），勿手改。版本 271c0ea4d2
const V = 'uuoo-271c0ea4d2';
const SHELL = ["/assets/AuthField-Cgank20z.js","/assets/AuthField-D5FdBAA1.css","/assets/Boards-DM5ICH6q.js","/assets/Boards-DfzJwJsS.css","/assets/Dialog-CDvhC_Mc.js","/assets/Dialog-DB-4AGY6.css","/assets/Feed-DbiFweuk.js","/assets/Feed-wGpJ3LfI.css","/assets/Following-DYiHcnVI.css","/assets/Following-DdS9YkEx.js","/assets/Home-CEBTYcJU.js","/assets/Home-VksvBgcp.css","/assets/LangSwitch-1lVV5d53.css","/assets/LangSwitch-CL-NZjLK.js","/assets/Legal-Bmz7tzBX.js","/assets/Legal-XxnNa49y.css","/assets/Login-EtoGeDzv.js","/assets/Me-Cy2b4X1l.css","/assets/Me-NQ3_PVG1.js","/assets/Phrases-CjL1m2WM.css","/assets/Phrases-p5gnqhnW.js","/assets/Profile--uNlY-q2.js","/assets/Profile-BSUMzJ7U.css","/assets/Quiz-CLXBRFM7.js","/assets/Quiz-D-657z87.css","/assets/Rank-BGdRgIE0.js","/assets/Rank-DcRF0kaU.css","/assets/Reading-BmZyoMkS.js","/assets/Reading-ngSZB_zb.css","/assets/RecoveryDialog-CaFPU1j1.css","/assets/RecoveryDialog-DcFYz_Gc.js","/assets/Reference-BdozDFnp.js","/assets/Reference-CJrkyiap.css","/assets/Register-TM8LrpZ-.js","/assets/Reset-BaXcnhAC.css","/assets/Reset-CXYwQcyR.js","/assets/Series-ByC21xiU.css","/assets/Series-Ng4m5MPm.js","/assets/Spell-BRVI0fM0.js","/assets/Spell-jLleO5Py.css","/assets/Support-B36jzseC.js","/assets/Support-Dt1BlCVs.css","/assets/index-BJHpLqWK.js","/assets/index-CICQlhzF.css","/assets/speak-C7nBfd1q.js","/assets/vant-Dii0QV-T.js","/assets/vue-BEXKDZn0.js","/index.html","/support-qr.png"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // 清掉旧版本缓存，避免无限增长
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => k.startsWith('uuoo-') && k !== V).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // 后端接口不缓存，始终走网络
  // 词库/短文等数据：缓存优先，命中就不再请求（内容变了文件名也会变）
  if (url.pathname.includes('/data/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const c = res.clone(); caches.open(V).then((cc) => cc.put(req, c)); }
      return res;
    })));
    return;
  }
  // 其余：网络优先，失败回落缓存 —— 保证发版后能拿到新代码，断网时仍可用
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const c = res.clone(); caches.open(V).then((cc) => cc.put(req, c)); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html'))));
});
