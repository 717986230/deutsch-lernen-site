// 预渲染：把 /oeif/、/kinder/ 首屏目录直接写进 HTML。
//
// 起因：这两页的正文全靠 JS 从 units.json / 内联数据拼出来，静态 HTML 里
// <div id="app"> 是空的。实测关掉 JS 打开，可见文字 0 字、0 个标题——
// 百度蜘蛛基本不跑 JS，于是这两页在百度眼里就是空白页；Google 虽然会渲染，
// 但要排进渲染队列，收录慢一拍。
//
// 做法：用浏览器真跑一遍首页路由，把 #app 渲染结果原样塞回
// <div id="app"><!--prerender-->…<!--/prerender--></div>。页面 JS 启动后照常
// innerHTML 覆盖，用户看到的和以前一模一样；爬虫拿到的就是同一份目录。
// （内容与真人看到的完全一致，不是 cloaking。）
//
// kinder/index.html 由 tools/gen-kinder.py 生成，重跑它会冲掉预渲染 → 之后再跑 npm run gen:seo。
// verify-seo-pages 会检查预渲染块存在且不为空。
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8751;
export const PRERENDER_PAGES = ['oeif/index.html', 'kinder/index.html'];
const RE = /<div class="wrap" id="app">(?:<!--prerender-->[\s\S]*?<!--\/prerender-->)?<\/div>/;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const srv = createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const p = join(ROOT, normalize(u).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const env = await getChromium();
if (!env) { skipNoBrowser('预渲染'); srv.close(); process.exit(0); }
const browser = await env.chromium.launch(env.launch);
let errs = 0;
for (const f of PRERENDER_PAGES) {
  const file = join(ROOT, f);
  const src = readFileSync(file, 'utf8');
  if (!RE.test(src)) { console.error(`ERROR ${f}: 找不到 <div class="wrap" id="app"></div>`); errs++; continue; }
  // 先清掉旧的预渲染再渲染，保证结果只取决于页面自己的 JS
  const clean = src.replace(RE, '<div class="wrap" id="app"></div>');
  writeFileSync(file, clean);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => { console.error(`ERROR ${f}: ${e}`); errs++; });
  await page.goto(`http://localhost:${PORT}/${f.replace(/index\.html$/, '')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const inner = await page.evaluate(() => document.getElementById('app').innerHTML.trim());
  await page.close();
  const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 200) { console.error(`ERROR ${f}: 渲染出的正文只有 ${text.length} 字`); errs++; writeFileSync(file, src); continue; }
  writeFileSync(file, clean.replace(RE, () => `<div class="wrap" id="app"><!--prerender-->${inner}<!--/prerender--></div>`));
  console.log(`  ${f.padEnd(20)} 预渲染 ${text.length} 字`);
}
await browser.close();
srv.close();
if (errs) process.exit(1);
