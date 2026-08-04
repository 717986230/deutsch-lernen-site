// 构建后生成 Service Worker：把产物清单写死进缓存列表，版本号取内容哈希。
// 不引 workbox —— 这个站的缓存策略很简单，一个文件说清楚比一个依赖更好维护。
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const DIST = 'dist';
const walk = (dir, base = '') => readdirSync(join(DIST, dir), { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? walk(join(dir, e.name), base) : [join(dir, e.name)]);

const files = walk('.').map((f) => f.replace(/^\.\//, '')).filter((f) => f !== 'sw.js');
const hash = createHash('sha256');
for (const f of files.sort()) hash.update(readFileSync(join(DIST, f)));
const ver = hash.digest('hex').slice(0, 10);

// 外壳与代码走「预缓存 + 版本更新」；数据切片体积大且不常变，走「用到才缓存、长期留存」
const shell = files.filter((f) => !f.startsWith('data/')).map((f) => '/' + f);
const sw = `// 自动生成（gen-sw.mjs），勿手改。版本 ${ver}
const V = 'uuoo-${ver}';
const SHELL = ${JSON.stringify(shell)};
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
`;
writeFileSync(join(DIST, 'sw.js'), sw);
console.log(`  sw.js 版本 ${ver}（预缓存 ${shell.length} 个外壳文件）`);
