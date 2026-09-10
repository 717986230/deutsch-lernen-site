// 版块回归：13 个版块 × 深浅双主题 × 中德/中英，逐个打开，断言零 pageerror、内容不为空。
//
// AGENTS.md §4 把这一轮列为「改了前端逻辑必须跑」的最低标准，但它一直只是一段
// 贴在临时目录里的脚本 —— 容器一回收就没了（这次就丢过一次）。收进 tools/ 常驻。
//
// 覆盖的版块与 AGENTS.md 里列的一致：
//   home phrases reading series dialog spell quiz rank grammar pronunciation numbers support me
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8738;
const SECS = 'home phrases reading series dialog spell quiz rank grammar pronunciation numbers support me'.split(' ');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.dat': 'application/octet-stream', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const env = await getChromium();
if (!env) { skipNoBrowser('版块回归'); srv.close(); process.exit(0); }
const browser = await env.chromium.launch(env.launch);

let checked = 0;
for (const lang of ['de', 'en']) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
    await page.addInitScript(([l, t]) => {
      localStorage.setItem('acct_token', 't1');
      localStorage.setItem('theme', t);
      if (l === 'en') localStorage.setItem('lang', 'en');
      const real = window.fetch;
      window.fetch = function (u) {
        const s = String(u);
        const j = (x) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
        if (s.indexOf('/api/me') >= 0) return j({ user: { username: 'u1', nickname: 'U', avatar: '🦊', av_bg: '#58cc02' }, rank: 1, followers: 0, following: 0 });
        if (s.indexOf('/api/') >= 0) return j({ rev: 1, document: {}, list: [], total: 0, badges: [] });
        return real.apply(this, arguments);
      };
      if (window.speechSynthesis) window.speechSynthesis.speak = function () {};
    }, [lang, theme]);
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window._DEC, null, { timeout: 25000 })
      .catch(() => bad(`${lang}/${theme}：德语词库一直没就绪`));

    for (const sec of SECS) {
      await page.evaluate((id) => showSection(id), sec).catch((e) => bad(`${lang}/${theme} showSection(${sec}) 抛错：${e.message}`));
      await page.waitForTimeout(220);
      const st = await page.evaluate(() => {
        const a = document.querySelector('.section.active');
        return a ? { id: a.id, txt: (a.innerText || '').trim().length } : null;
      });
      checked++;
      if (!st) { bad(`${lang}/${theme} ${sec}：没有任何 .active 版块`); continue; }
      // 40 字是「渲染失败只剩标题」和「正常内容」之间的分界，实测最空的版块也远超这个数
      if (st.txt < 40) bad(`${lang}/${theme} ${sec} → ${st.id}：内容只有 ${st.txt} 字，疑似没渲染`);
    }
    for (const e of errs) bad(`${lang}/${theme} 抛错：${e}`);
    await page.close();
  }
}

// ── 长列表必须分批渲染 ──
// 阅读 69 篇 / 连载 12 集都要给每个德语词包 <span> 做逐词小注，是全站最贵的渲染。
// 一次性建完再 innerHTML 就是一个堵死主线程的长任务：连载曾经这么写，实测在
// 4 倍降速的手机档位上单个任务 1152ms —— 整整一秒多点什么都没反应。
// 这里不测耗时（换台机器就飘），只断言「同步返回时列表还没建完、之后才补齐」，
// 也就是 rAF 分批循环确实在跑；顺带确认首批不为空（首屏不能是白的）。
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const batchErrs = [];
  page.on('pageerror', (e) => batchErrs.push(String(e).split('\n')[0]));
  await page.addInitScript(() => { try { localStorage.setItem('acct_token', 't1'); } catch (e) {} });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window._DEC, null, { timeout: 25000 }).catch(() => {});
  for (const [name, sec, fn, sel, minTotal] of [
    ['阅读短文', 'reading', 'renderReadings', '#readList > .card', 7],
    ['留学连载', 'series', 'renderSeries', '#seriesList > .card', 3],
  ]) {
    const r = await page.evaluate(async ([sec, fn, sel]) => {
      showSection(sec);
      if (typeof window[fn] !== 'function') return { missing: 1 };
      window[fn]();
      const first = document.querySelectorAll(sel).length;   // 同步返回那一刻
      for (let i = 0; i < 90; i++) await new Promise((r) => requestAnimationFrame(r));
      return { first, final: document.querySelectorAll(sel).length };
    }, [sec, fn, sel]);
    if (r.missing) { bad(`${name}：找不到 ${fn}()，是不是被改名了`); continue; }
    if (!r.final || r.final < minTotal) { bad(`${name}：最终只渲染出 ${r.final} 篇，疑似没渲染`); continue; }
    if (!r.first) bad(`${name}：${fn}() 同步返回时一篇都没有，首屏会是白的`);
    else if (r.first >= r.final) bad(`${name}：${fn}() 同步就把 ${r.first} 篇全建完了（应分批），主线程会被一个长任务堵死`);
  }
  for (const e of batchErrs) bad(`分批渲染检查抛错：${e}`);
  await page.close();
}

await browser.close();
srv.close();
console.log(`版块回归：${SECS.length} 版块 × 深浅双主题 × 中德/中英，共打开 ${checked} 次；阅读/连载分批渲染各验一遍`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 全部版块零报错、内容非空');
