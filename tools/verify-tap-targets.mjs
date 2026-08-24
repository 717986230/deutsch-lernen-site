// 触摸目标体检：真浏览器里逐个量「实际能点到的范围」，而不是量 CSS 写了什么。
//
// 起因：仓库里早就有一条给按钮撑 44px 热区的规则（.btn::after 等 21 个选择器），
// 但它带了 pointer-events:none —— 伪元素不参与命中测试，整条规则完全没生效。
// 实测「🔊 全部朗读」视觉 33px 高、可点也只有 34px，跟没写一样。
// 光看 CSS 看不出来，只有拿 elementFromPoint 一格一格探才知道，所以钉成用例。
//
// 同时把撑热区的副作用一并盯住：热区变大可能盖住并排/上下相邻的控件，
// 把邻居变成点不动 —— 那比矮几个像素严重得多。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8734;
const MIN = 44;                       // WCAG 2.5.5 / 各家移动端指南的通行下限
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

const browserEnv = await getChromium();
if (!browserEnv) { skipNoBrowser('触摸目标体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  localStorage.setItem('acct_token', 't1');
  const real = window.fetch;
  window.fetch = function (u) {
    const s = String(u);
    const j = (x) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
    if (s.indexOf('/api/me') >= 0) return j({ user: { username: 'u1', nickname: 'U', avatar: '🦊', av_bg: '#58cc02' }, rank: 1, followers: 0, following: 0 });
    if (s.indexOf('/api/') >= 0) return j({ rev: 1, document: {}, list: [], total: 0, badges: [] });
    return real.apply(this, arguments);
  };
});
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC, null, { timeout: 20000 }).catch(() => {});
// 首访的语音包推广是整屏遮罩，会把底下所有控件都判成「被遮挡」——量之前先关掉
await page.addStyleTag({ content: '#boostModal{display:none!important}' });

// 量过、确认不改的：边条式浮标 .beginner-fab 视觉只有 20px 宽，
// 靠左贴边，热区居中撑到 44 会有一半落在屏幕外；改成向右撑开倒是能凑够 44，
// 但它是盖在正文之上的固定浮层，右侧那 24px 会把底下文章的点击全吞掉 ——
// 宁可窄一点。纵向 60px 好按，实测 32.4×60.6。
const EXEMPT = { '🌱 零基础入门': '贴左边缘的竖排浮标，横向撑热区会吞掉正文点击' };

const SECS = 'home phrases reading series dialog spell quiz rank grammar pronunciation numbers support me en-pron en-num en-grammar'.split(' ');
const probe = async (sec) => {
  await page.evaluate((s) => showSection(s), sec);
  await page.waitForTimeout(280);
  return page.evaluate(([sec, MIN]) => {
    const root = document.getElementById(sec);
    const out = [];
    let measured = 0, skipped = 0;
    const els = [...root.querySelectorAll('button,a[href],[onclick],input[type=range],select')];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;                      // 隐藏的不算
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') continue;
      // 折叠起来的 <details> 里的东西量不了（位置是陈的），也点不到，跳过
      if (el.closest('details:not([open])')) continue;
      // WCAG 2.5.8 的 Inline 例外：夹在句子里的目标（短文/连载的点词查义、
      // 正文里的行内链接）尺寸由行高决定，撑大反而会把行距撑乱，不在考核范围。
      if (cs.display === 'inline') continue;
      el.scrollIntoView({ block: 'center' });
      const b = el.getBoundingClientRect();
      const cx = Math.round(b.left + b.width / 2), cy = Math.round(b.top + b.height / 2);
      // 滚过之后中心仍不在视口里 = 这次没量成，如实记账，别当成「通过」
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) { skipped++; continue; }
      measured++;
      const own = (t) => t === el || el.contains(t);
      const at = document.elementFromPoint(cx, cy);
      const label = (el.textContent || el.getAttribute('aria-label') || el.id || el.className || '?').trim().slice(0, 14);
      if (!own(at)) {
        // 自己的正中心都点不到 —— 要么被遮罩盖了，要么被邻居的热区抢了
        const thief = at ? (at.id ? '#' + at.id : '.' + String(at.className || '').split(' ')[0]) : 'null';
        out.push({ label, kind: '抢点', thief });
        continue;
      }
      // 整数步进会因为按钮落在半像素上白丢 1px（实测把 44 量成 43），
      // 所以按方向二分到 0.05px —— 报出来的数字要经得起「差 1px」的质疑。
      const reach = (dx, dy) => {
        if (!own(document.elementFromPoint(cx + dx * 0.5, cy + dy * 0.5))) return 0;
        let lo = 0.5, hi = 60;
        while (hi - lo > 0.01) {
          const mid = (lo + hi) / 2;
          if (own(document.elementFromPoint(cx + dx * mid, cy + dy * mid))) lo = mid; else hi = mid;
        }
        return lo;
      };
      const h = reach(0, -1) + reach(0, 1), w = reach(-1, 0) + reach(1, 0);
      // 二分只保证收敛到真实边界内侧 0.01，两侧合计最多少算 0.02，
      // 所以判定留这点余量，免得把正好 44 的报成「不足」。
      const EPS = 0.05;
      if (h < MIN - EPS || w < MIN - EPS) out.push({ label, kind: '过小', w: +w.toFixed(1), h: +h.toFixed(1) });
    }
    return { out, measured, skipped };
  }, [sec, MIN]);
};

let checked = 0, small = 0, stolen = 0, total = 0, unmeasured = 0, exempt = 0;
for (const sec of SECS) {
  let res;
  try { res = await probe(sec); } catch (e) { bad(`${sec} 版块探测失败：${e.message}`); continue; }
  checked++; total += res.measured; unmeasured += res.skipped;
  for (const h of res.out) {
    if (h.kind === '抢点') { stolen++; bad(`${sec}「${h.label}」正中心点不到，被 ${h.thief} 挡住`); }
    else if (EXEMPT[h.label]) exempt++;
    else { small++; bad(`${sec}「${h.label}」实际可点 ${h.w}×${h.h}，不足 ${MIN}×${MIN}`); }
  }
}

await browser.close();
srv.close();
console.log(`触摸目标体检：${checked} 个版块、实测 ${total} 个控件（按命中测试量，非读 CSS）`
  + (unmeasured ? `，另有 ${unmeasured} 个滚不进视口没量成` : '')
  + (exempt ? `，放行 ${exempt} 个已记录在案的例外` : ''));
if (fail) { console.error(`\n共 ${fail} 处问题（过小 ${small} · 被抢点 ${stolen}）`); process.exit(1); }
console.log(`OK 所有可见控件的可点范围都 ≥ ${MIN}×${MIN}，且没有互相抢点`);
