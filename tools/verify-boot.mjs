// 启动期体检：真浏览器跑 index.html，断言零 pageerror、页面真的进得去。
//
// 起因是 2026-08 的线上白屏：
//   Uncaught ReferenceError: _dailyGet is not defined
// index.html 有 7 个 <script> 块，块与块之间 HTML 解析器会回到事件循环 ——
// 于是第 N 块里登记的网络回调，可能在第 N+1 块**还没解析**时就被调用。
// `_progressDoc()`（账号块）要用 `_dailyGet` / `_spWrongGet`（拼写块），
// 一插队就 ReferenceError，整条初始化链断掉 → 白屏。
//
// 静态扫描很难判断「哪个跨块引用会在解析期被同步触发」，所以这里直接用
// **同步已决议的 fetch 桩**把最坏时序钉死：`/api/*` 立刻返回，回调必然落在
// 当前脚本块结束的微任务检查点上 —— 那一刻就是事故现场。
//
// 顺带覆盖两个同源问题：解析期 showSection 里那排 `typeof X==='function'`
// 守卫会集体判假，深链 #spell 打开空白、#home 的今日课程恒显示 0 词。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8731;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.dat': 'application/octet-stream', '.css': 'text/css', '.svg': 'image/svg+xml' };
// file:// 取不到 .dat，必须起 http server
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const browserEnv = await getChromium();
if (!browserEnv) { skipNoBrowser('启动期体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);

// 所有 /api/* 同步返回，把「回调插进两个脚本块之间」这个最坏时序钉死
const STUB = () => {
  const real = window.fetch;
  window.fetch = function (u) {
    const s = String(u);
    const json = (j) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(j) });
    if (s.indexOf('/api/me') >= 0) return json({ user: { username: 'u1', nickname: 'U', avatar: '🦊', av_bg: '#58cc02' }, rank: 1, followers: 0, following: 0 });
    if (s.indexOf('/api/progress') >= 0) return json({ rev: 1, document: {} });
    if (s.indexOf('/api/') >= 0) return json({ list: [], badges: [] });
    return real.apply(this, arguments);
  };
};

async function boot({ hash = '', token = 't1', label }) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await page.addInitScript(STUB);
  await page.addInitScript(`(function(){try{${token ? `localStorage.setItem('acct_token',${JSON.stringify(token)})` : `localStorage.removeItem('acct_token')`}}catch(e){}})();`);
  await page.goto(`http://localhost:${PORT}/index.html${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  for (const e of errs) bad(`${label} 抛错：${e}`);
  const state = await page.evaluate(() => ({
    locked: document.documentElement.classList.contains('locked'),
    active: [...document.querySelectorAll('.section.active')].map((s) => s.id),
    daily: (document.querySelector('.dash-daily .dd-txt span') || {}).textContent || '',
    spSetup: !!document.querySelector('#spSetup .sp-levels button'),
  }));
  await page.close();
  return state;
}

// ① 已登录进首页：不许抛错，必须解锁并落在某个版块上
const home = await boot({ label: '已登录启动' });
if (home.locked) bad('已登录启动后仍带 locked，页面是白的');
if (home.active.length !== 1) bad(`已登录启动后 .active 版块有 ${home.active.length} 个，应为 1`);

// ② 深链 #spell：spInit 在后一个脚本块里，解析期调用会被 typeof 守卫吞掉
const spell = await boot({ hash: '#spell', label: '深链 #spell' });
if (!spell.active.includes('spell')) bad(`深链 #spell 落在 ${spell.active.join(',') || '（无）'}`);
if (!spell.spSetup) bad('深链 #spell 没跑 spInit —— 级别按钮没渲染出来，页面是空的');

// ③ 深链 #home：今日课程卡要吃到 dailyPlan()，不能恒为 0 词
const dash = await boot({ hash: '#home', label: '深链 #home' });
if (!dash.active.includes('home')) bad(`深链 #home 落在 ${dash.active.join(',') || '（无）'}`);
if (/^0 词/.test(dash.daily)) bad(`深链 #home 的今日课程显示「${dash.daily}」—— dailyPlan() 没跑到`);

// ④ 未登录：必须上锁并停在登录页
const out = await boot({ token: '', label: '未登录启动' });
if (!out.locked) bad('未登录启动没有上锁');
if (!out.active.includes('account')) bad(`未登录启动落在 ${out.active.join(',') || '（无）'}，应为 account`);

// ⑤ 只供查阅的条目（ref:1）不能混进拼写和测验题库
// 菜单分类里 92 个菜名多是英/日文，逐字母拼「Yaki Udon Kamoniku」学不到德语，
// 加上之前一次性占掉 a2 句子拼写池的 12%。同分类里 51 个德语词不带 ref，照常参练。
const pagePool = await browser.newPage({ viewport: { width: 390, height: 844 } });
await pagePool.addInitScript(STUB);
await pagePool.addInitScript(`try{localStorage.setItem('acct_token','t1')}catch(e){}`);
await pagePool.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await pagePool.waitForFunction(() => window._DEC, null, { timeout: 20000 }).catch(() => {});
const pool = await pagePool.evaluate(() => {
  const refs = new Set(), plain = new Set();
  for (const c of categories) for (const p of c.phrases) (p.ref ? refs : plain).add(p.de);
  if (!refs.size) return { none: true };
  const hit = (arr) => arr.filter((x) => refs.has(x.de)).length;
  SP.unit = 'sent'; const sent = spBuildPool('all');
  SP.unit = 'word'; const word = spBuildPool('all');
  quizLevel = 'all';
  const quiz = getAllPhrases();
  return { refs: refs.size, sent: hit(sent), word: hit(word), quiz: hit(quiz),
    plainInQuiz: quiz.filter((x) => plain.has(x.de)).length };
});
await pagePool.close();
if (pool.none) bad('没有任何 ref:1 条目 —— 标记丢了，菜名会重新混进题库');
else {
  if (pool.sent) bad(`句子拼写池里混进 ${pool.sent} 条只供查阅的条目`);
  if (pool.word) bad(`单词拼写池里混进 ${pool.word} 条只供查阅的条目`);
  if (pool.quiz) bad(`测验题库里混进 ${pool.quiz} 条只供查阅的条目`);
  if (!pool.plainInQuiz) bad('题库里一条普通词条都没有 —— ref 过滤把该留的也滤掉了');
}

await browser.close();
srv.close();
console.log(`启动期体检：4 种入口 · 今日课程「${dash.daily}」`
  + (pool.refs ? ` · ${pool.refs} 条只供查阅的条目已挡在题库外` : ''));
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 启动期零报错');
