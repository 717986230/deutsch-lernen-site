// 「离线可用」体检 —— 站里 meta description 和落地页都写着这四个字，那就得真能用。
//
// 起因：实测发现首访之后 SW 的持久缓存 de-data 是**空的**。
// 原因是词典切片那次 fetch 往往发生在 SW 取得控制**之前**，SW 的 fetch 处理器
// 根本拦不到它 —— 407KB 的词库只躺在浏览器 HTTP 缓存里，随时会被清。
// 表现就是：装完 PWA 到桌面 → 上飞机 → 打开 = 空词库。而这恰恰是 PWA 最典型的用法。
// 修法是让 loader 自己把响应写进 de-data（build.mjs 里两处，de 和 en 各一份）。
//
// 这道检查盯三件事：
//   ① 首访结束时 de-data 里必须已经有德语切片（而不是等第二次访问才有）；
//   ② 切到英语后英语切片也要落盘（同一段代码抄了两份，改的时候极容易只改一份）；
//   ③ 清掉浏览器 HTTP 缓存再断网，页面要能开、词库要在、核心版块要能用、0 报错。
//
// 特别提醒：clone() 必须**同步**调用。写成 caches.open().then(c=>c.put(f,r.clone()))
// 就晚了——那时 r.text() 已经开始读 body，clone 抛 "body already used"，
// 错误还被 catch 吞掉，于是「代码明明在，缓存还是空的」。这坑踩过一次，③ 也拦不住它，
// 只有 ① 能。
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8741;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.dat': 'application/octet-stream', '.css': 'text/css', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json' };
const datOf = (p) => readdirSync(ROOT).find((f) => new RegExp(`^${p}\\.[a-f0-9]{8}\\.dat$`).test(f));
const DE_DAT = datOf('de'), EN_DAT = datOf('en');
if (!DE_DAT || !EN_DAT) { console.error('ERROR 找不到词典切片 .dat，先跑 npm run build'); process.exit(1); }

let datHits = 0;
const srv = createServer((req, res) => {
  const path = req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0];
  const p = join(ROOT, normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  if (p.endsWith('.dat')) datHits++;
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const browserEnv = await getChromium();
if (!browserEnv) { skipNoBrowser('离线可用体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.addInitScript(() => { try { localStorage.setItem('acct_token', 't1'); } catch (e) {} });

const cached = async () => page.evaluate(async () => {
  if (!self.caches) return [];
  const c = await caches.open('de-data');
  return (await c.keys()).map((r) => new URL(r.url).pathname.replace(/^\//, ''));
});

// ── ① 首访：德语切片必须当场进 de-data ──
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC, null, { timeout: 25000 });
await page.waitForTimeout(1000);          // 给 caches.put 一点时间落盘
let keys = await cached();
if (!keys.includes(DE_DAT)) {
  bad(`首访结束时 de-data 里没有 ${DE_DAT}（现有：${keys.join('、') || '空'}）`
    + ' —— 装完 App 第一次离线打开会是空词库；检查 build.mjs 里 loader 的 clone() 是否同步调用');
}

// ── ② 切英语：英语切片同样要落盘 ──
await page.evaluate(() => { try { setLang('en'); } catch (e) {} });
await page.waitForFunction(() => window._ENC, null, { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(1000);
keys = await cached();
if (!keys.includes(EN_DAT)) bad(`切到英语后 de-data 里没有 ${EN_DAT}（现有：${keys.join('、') || '空'}）`);
await page.evaluate(() => { try { setLang('de'); } catch (e) {} });

// ── ③ 清掉浏览器 HTTP 缓存 + 断网：只剩 SW 缓存能救 ──
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.clearBrowserCache');
await ctx.setOffline(true);
datHits = 0;
let loaded = true;
try { await page.reload({ waitUntil: 'load', timeout: 20000 }); } catch (e) { loaded = false; }
if (!loaded) bad('断网后刷新打不开页面（SW 壳缓存没兜住）');
else {
  await page.waitForFunction(() => window._DEC, null, { timeout: 20000 })
    .catch(() => bad('断网后词库没到货 —— de-data 没兜住 .dat'));
  // 版块渲染是 rAF 分批的，切过去要等一拍再数，否则数到 0 是自己的锅不是离线的锅
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r2) => setTimeout(r2, ms));
    const n = window._DEC ? window._DEC.reduce((a, c) => a + c.phrases.length, 0) : 0;
    const out = { words: n, sections: {} };
    const count = (sel) => document.querySelectorAll(sel).length;
    try { showSection('phrases'); await wait(900); out.sections['词句'] = count('#phraseContent .card'); } catch (e) { out.sections['词句'] = 0; }
    try { showSection('reading'); await wait(1200); out.sections['短文'] = count('#readList .card'); } catch (e) { out.sections['短文'] = 0; }
    // 图解页默认是人体图（boardGrid 隐藏），得切到一个网格板才有 .pic-cell
    try { showSection('body'); await wait(400); switchBoard('zeit'); await wait(300); out.sections['图卡'] = count('#boardGrid .pic-cell'); } catch (e) { out.sections['图卡'] = 0; }
    try { showSection('quiz'); startQuiz('phrase'); await wait(300); out.sections['测验'] = count('#mainQuizArea .quiz-opt'); } catch (e) { out.sections['测验'] = 0; }
    return out;
  });
  if (r.words < 4000) bad(`断网后词库只有 ${r.words} 词（应 ≥4000）`);
  for (const [id, n] of Object.entries(r.sections)) {
    if (!n) bad(`断网后「${id}」版块渲染为空`);
  }
  console.log(`  断网后：词库 ${r.words} 词，`
    + Object.entries(r.sections).map(([k, v]) => `${k} ${v}`).join('、'));
}
if (datHits) bad(`断网期间还往服务器发了 ${datHits} 次 .dat 请求（离线状态下必然失败）`);
if (errs.length) bad(`离线过程中出现 ${errs.length} 条 JS 报错：${errs.slice(0, 3).join(' | ')}`);

await browser.close(); srv.close();
console.log(`离线可用体检：首访落盘 ${DE_DAT} / ${EN_DAT}，清 HTTP 缓存后断网仍可用`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 离线可用');
