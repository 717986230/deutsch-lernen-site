// 词库切片（de.<hash>.dat / en.<hash>.dat）弱网下载失败时的体检。
//
// 起因：用户截图报了一个线上真实事故——首页弹出诊断红条
//   ⚠️ Promise 出错（截图发我）
//   Failed to fetch
// 复现后发现是两个叠加的 bug：
//   ① _deEnsure(cb) 只写了 _loadDE().then(cb)，没有 .catch()。fetch 失败时
//      _loadDE() 返回的 promise 会 reject，这条没人接的 .then() 链就变成
//      unhandledrejection —— 诊断红条把 "Failed to fetch" 原样甩给用户。
//   ② 更严重：renderPhrases() 一开头就把 _rendered.phrases 置 true（防止重复渲染），
//      而 _deEnsure 失败后回调根本不会跑。于是词句页卡死在「📖 词库加载中…」——
//      哪怕网络恢复，切走再切回来 showSection 也不会再调 renderPhrases 了，
//      只有刷新整个页面才能救回来。
// 英语拼写页的 spUpdatePoolInfo/spEnsure 是同一个模式，同一批 bug。
//
// 这里用一台会把第一批 .dat 请求全部掐断的假服务器复现，断言：
//   · 不再冒出诊断红条 / pageerror（问题①）
//   · 卡住的地方会给一条「点击重试」，点了之后网络恢复就能救回来（问题②）
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8738;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.dat': 'application/octet-stream', '.css': 'text/css', '.svg': 'image/svg+xml' };

let allowDat = false;      // 先让 .dat 请求全部失败（模拟持续弱网），后面手动放行模拟网络恢复
let datHits = 0;
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (/\/(de|en)\.[a-f0-9]{8}\.dat$/.test(req.url)) {
    datHits++;
    if (!allowDat) { req.socket.destroy(); return; }   // 直接断连接，逼出真正的 fetch TypeError
  }
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const browserEnv = await getChromium();
if (!browserEnv) { skipNoBrowser('词库弱网加载体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.addInitScript(() => { try { localStorage.setItem('acct_token', 't1'); } catch (e) {} });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);   // 让解锁后的后台预取先失败一次

// ── ① 德语词句页：打开时词库仍未就绪，会走 _deEnsure 再请求一次，同样失败 ──
await page.evaluate(() => showSection('phrases'));
await page.waitForTimeout(800);

const s1 = await page.evaluate(() => ({
  banner: (document.getElementById('__eb') || {}).textContent || null,
  hasRetry: !!document.getElementById('phRetryBtn'),
  html: (document.getElementById('phraseContent') || {}).innerHTML || '',
}));
if (s1.banner) bad(`词句页加载失败后冒出了诊断红条：${s1.banner}`);
if (!s1.hasRetry) bad(`词句页加载失败后没有给「点击重试」按钮，内容是：${s1.html.slice(0, 100)}`);

allowDat = true;   // 网络恢复
if (s1.hasRetry) {
  await page.evaluate(() => document.getElementById('phRetryBtn').click());
  await page.waitForTimeout(700);
  const s2 = await page.evaluate(() => ({
    n: typeof categories !== 'undefined' ? categories.length : -1,
    cards: document.querySelectorAll('#phraseContent .card').length,
    stillFail: /加载失败/.test((document.getElementById('phraseContent') || {}).textContent || ''),
  }));
  if (s2.n <= 0) bad(`点了重试，网络也恢复了，categories 还是空的（${s2.n}）`);
  if (!s2.cards) bad('点了重试，词句页还是一张卡片都没渲染出来');
  if (s2.stillFail) bad('点了重试，页面还停在「加载失败」文案上');
}

// ── ② 英语拼写页：同一套 spEnsure/spUpdatePoolInfo，重新调回失败状态验一遍 ──
allowDat = false;
await page.evaluate(() => { setLang('en'); showSection('spell'); });
await page.waitForTimeout(800);
const s3 = await page.evaluate(() => ({
  banner: (document.getElementById('__eb') || {}).textContent || null,
  hasRetry: !!document.getElementById('spRetryBtn'),
}));
if (s3.banner) bad(`英语拼写页加载失败后冒出了诊断红条：${s3.banner}`);
if (!s3.hasRetry) bad('英语拼写页加载失败后没有给「点击重试」按钮');

allowDat = true;
if (s3.hasRetry) {
  await page.evaluate(() => { const b = document.getElementById('spRetryBtn'); if (b) b.click(); });
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => (document.getElementById('spPoolInfo') || {}).textContent || '');
  if (!/待记|都掌握啦/.test(info)) bad(`点了重试，spPoolInfo 没有恢复正常，实际：${info}`);
}

for (const e of errs) bad('页面抛错：' + e);

await browser.close();
srv.close();
console.log(`词库弱网加载体检：${datHits} 次 .dat 请求，德语词句页 + 英语拼写页各验一遍失败与重试`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 弱网下载失败不再冒诊断红条，且能真的点「重试」救回来');
