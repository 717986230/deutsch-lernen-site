// 自动生成（gen-sw.mjs），勿手改。版本 7da95a5f6e
const V = 'uuoo-7da95a5f6e';
const SHELL = ["/assets/AuthField-BfY50YDV.js","/assets/AuthField-D5FdBAA1.css","/assets/Boards-9P48U_FL.js","/assets/Boards-DgNEQHPJ.css","/assets/Dialog-DZEhOv4X.js","/assets/Dialog-vCiWdUiU.css","/assets/Feed-DxZx6O6U.css","/assets/Feed-b6b2t9Ac.js","/assets/Following-BC449o8e.js","/assets/Following-BogYAbS8.css","/assets/Home-Cdd_t9k2.js","/assets/Home-wsyjaJ20.css","/assets/Legal-BlONyhRF.js","/assets/Legal-CAhMMzQg.css","/assets/Login-CIjYPPq9.css","/assets/Login-q_UHbbU4.js","/assets/Me-BnBWM9qN.js","/assets/Me-DSX6UsoQ.css","/assets/NotFound-BX6GY-q6.js","/assets/NotFound-Dy-dM3da.css","/assets/Phrases-BkpWh1an.css","/assets/Phrases-BnfrylKL.js","/assets/Profile-BaL1EqRm.css","/assets/Profile-BrzNUjSj.js","/assets/Quiz-C7cnaBbD.css","/assets/Quiz-GgalscP1.js","/assets/Rank-CKqZSqxa.css","/assets/Rank-CjnURYVL.js","/assets/Reading-DwW8j44p.css","/assets/Reading-MrtyYE8g.js","/assets/RecoveryDialog-D1fBydQY.css","/assets/RecoveryDialog-DXUtnuEg.js","/assets/Reference-6BaBA9lP.js","/assets/Reference-Dkj2TqPf.css","/assets/Register-DQYO7e5l.js","/assets/Reset-DttxBfLT.css","/assets/Reset-Dw1xeQvf.js","/assets/Series-CTWdrXs1.css","/assets/Series-DsK0Mskk.js","/assets/Spell-Cq8rSSwi.css","/assets/Spell-jQVlJH3x.js","/assets/Support-DLWM3uLH.css","/assets/Support-Dk03jXZW.js","/assets/index-B0frw6S5.css","/assets/index-CfcflDFw.js","/assets/reader-j4cWMH5q.js","/assets/vant-Cvcz6CtF.js","/assets/vue-D4NjTlBb.js","/index.html","/support-qr.png"];
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
