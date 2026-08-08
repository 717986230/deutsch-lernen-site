// 自动生成（gen-sw.mjs），勿手改。版本 66e9fcb4d5
const V = 'uuoo-66e9fcb4d5';
const SHELL = ["/assets/AuthField-BPBgH9kJ.js","/assets/AuthField-D5FdBAA1.css","/assets/Boards-1Xn_UgoX.js","/assets/Boards-DfzJwJsS.css","/assets/Dialog-DB-4AGY6.css","/assets/Dialog-Dw8hs0Zt.js","/assets/Feed-BrJM0f_q.js","/assets/Feed-wGpJ3LfI.css","/assets/Following-DYiHcnVI.css","/assets/Following-h11Em-t1.js","/assets/Home-Dil0ZaFS.js","/assets/Home-VksvBgcp.css","/assets/LangSwitch-1lVV5d53.css","/assets/LangSwitch-DcNudAoO.js","/assets/Legal-B4OqscLD.js","/assets/Legal-XxnNa49y.css","/assets/Login-BhYANy-l.css","/assets/Login-_IoUQyaX.js","/assets/Me-5buVUrjH.js","/assets/Me-Cy2b4X1l.css","/assets/Phrases-B-UkoMU5.js","/assets/Phrases-CjL1m2WM.css","/assets/Profile-BSUMzJ7U.css","/assets/Profile-Bgmyq2ji.js","/assets/Quiz-D-657z87.css","/assets/Quiz-DDIc6Bj1.js","/assets/Rank-DcRF0kaU.css","/assets/Rank-Ga1pYh8V.js","/assets/Reading-BcPDhR1v.js","/assets/Reading-ngSZB_zb.css","/assets/RecoveryDialog-BdyrchDm.js","/assets/RecoveryDialog-CaFPU1j1.css","/assets/Reference-Bp5h2zOU.js","/assets/Reference-CJrkyiap.css","/assets/Register-Dn2tG-2l.js","/assets/Reset-BTPAv1BM.js","/assets/Reset-BaXcnhAC.css","/assets/Series-ByC21xiU.css","/assets/Series-CZOvU-sX.js","/assets/Spell-fj0TIuDP.js","/assets/Spell-jLleO5Py.css","/assets/Support-CJ1SPZVC.js","/assets/Support-Dt1BlCVs.css","/assets/index-BcRu3LiL.js","/assets/index-CICQlhzF.css","/assets/speak-C7nBfd1q.js","/assets/vant-Dii0QV-T.js","/assets/vue-BEXKDZn0.js","/index.html","/support-qr.png"];
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
