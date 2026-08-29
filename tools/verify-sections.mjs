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

await browser.close();
srv.close();
console.log(`版块回归：${SECS.length} 版块 × 深浅双主题 × 中德/中英，共打开 ${checked} 次`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 全部版块零报错、内容非空');
