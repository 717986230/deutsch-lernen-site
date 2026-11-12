// 切页回顶回归（2026-11-12 用户反馈「切页面老是不在顶部」）：
//  1) 每个版块从别的版块的底部切进来，必须在顶部；
//  2) 版块内换标签/分组/单元/编辑资料，锚点（那排标签）不能留在视口上方；
//  3) 返回键回到离开时的位置（含会员版块：内容到货后再还原），前进/新开版块在顶部；刷新落在顶部。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';
import { stubPro } from './_pro-stub.mjs';
const ROOT = process.cwd(), PORT = 8763;
let fail = 0; const bad = (m) => { console.error('ERROR ' + m); fail++; };
const srv = createServer((req, res) => { const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0]))); if (!existsSync(p)) { res.writeHead(404); return res.end(); } const M = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' }; res.writeHead(200, { 'Content-Type': M[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' }); res.end(readFileSync(p)); });
await new Promise((r) => srv.listen(PORT, r));
const env = await getChromium(); if (!env) { skipNoBrowser('切页回顶'); srv.close(); process.exit(0); } const b = await env.chromium.launch(env.launch);
const page = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await stubPro(page);
page.on('pageerror', (e) => bad('pageerror ' + e.message));
await page.addInitScript(() => { localStorage.setItem('acct_token', 't1'); localStorage.setItem('annSeen', '["*"]'); localStorage.setItem('wnSeen','["*"]');
  const real = window.fetch; window.fetch = function (u) { const s = String(u); const j = (x) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
    if (s.indexOf('/api/pro/content') >= 0) return real.apply(this, arguments);
    if (s.indexOf('/api/me') >= 0) return j({ user: { username: 'u1', nickname: 'U', avatar: '🦊', av_bg: '#58cc02', pro_until: Date.now() + 864e5 }, rank: 1, followers: 0, following: 0 });
    if (s.indexOf('/api/') >= 0) return j({ rev: 1, document: {}, list: [], total: 0, badges: [] }); return real.apply(this, arguments); }; });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC);
for (const s of 'home pronunciation numbers grammar phrases reading series dialog resto kolloc affix wortschatz quiz spell rank body support pro me wordbook stats'.split(' ')) {
  const r = await page.evaluate(async (s) => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
    showSection('phrases'); await w(300); scrollTo(0, document.documentElement.scrollHeight); await w(80);
    showSection(s); await w(600); return scrollY; }, s);
  if (r > 5) bad(`切到 ${s} 后不在顶部（scrollY=${r}）`);
}
const cases = [['phrases',"setLevel('a2')",'levelTabs'],['phrases',"setCat('all',document.querySelector('.cat-tab'))",'catTabs'],['reading',"setReadLevel('a2')",'readLevelTabs'],['wortschatz','wtGroup(3)','wtGroups'],['kolloc','kcVerb(2)','kcChips'],['resto','rsTab(2)','rsTabs'],['affix','afGo(4)','afChips'],['body',"switchBoard(PIC_BOARDS[3].id)",'boardTabs'],['me','meEditOpen()','meEdit']];
for (const [sec, fn, anc] of cases) {
  const r = await page.evaluate(async ([sec, fn, anc]) => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
    showSection(sec); await w(900); scrollTo(0, document.documentElement.scrollHeight); await w(150); const from = scrollY;
    (0, eval)(fn); await w(400); const a = document.getElementById(anc); const top = a ? Math.round(a.getBoundingClientRect().top) : null;
    return { from, y: scrollY, ancTop: top, tb: document.getElementById('topbar').offsetHeight }; }, [sec, fn, anc]);
  if (!(r.ancTop != null && r.ancTop >= 0 && r.ancTop < 200)) bad(`${fn}：换完锚点在 ${r.ancTop}px（从 ${r.from} 滚动位置切换），没回到可见处`);
}
const r2 = await page.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
  showSection('phrases'); await w(500); scrollTo(0, 3000); await w(100); showSection('grammar'); await w(400); const g = scrollY; history.back(); await w(1500); const back = scrollY;
  history.forward(); await w(800); return { g, back, fwd: scrollY, hash: location.hash }; });
if (r2.back !== 3000) bad('返回键没回到原位置：' + JSON.stringify(r2)); if (r2.fwd !== 0) bad('前进后应在顶部：' + JSON.stringify(r2));
const r3 = await page.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
  showSection('wortschatz'); await w(800); scrollTo(0, 5000); await w(100); const before=scrollY; const k1=history.state&&history.state.k; showSection('home'); await w(400); _LKD={}; history.back(); const t=[]; for(let i=0;i<20;i++){await w(250); t.push(scrollY+'/'+document.documentElement.scrollHeight+(document.getElementById('wortschatz').classList.contains('sec-locked')?'L':''));} return { t: t.slice(0,3).join(' '), before, back: scrollY, hash: location.hash }; });
if (r3.back !== r3.before) bad('会员版块返回位置不对：' + JSON.stringify(r3));
const r4 = await page.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
  showSection('kolloc'); await w(900); scrollTo(0, 4000); await w(200); const before=scrollY; showSection('home'); await w(300);
  window._LKD = {}; try{await caches.delete('pro-data');}catch(e){} const rd=_lockReady('kolloc'); history.back(); const t=[]; for(let i=0;i<16;i++){await w(250); t.push(scrollY+(document.getElementById('kolloc').classList.contains('sec-locked')?'L':''));} return { rd, before, t: t.join(' ') }; });
if (!r4.t.endsWith(String(r4.before))) bad('会员内容重新到货后位置不对：' + JSON.stringify(r4));
await page.click('#bottomNav .bn-btn[data-sec=phrases]'); await page.waitForTimeout(500); await page.mouse.wheel(0, 6000); await page.waitForTimeout(600);
const yb = await page.evaluate(() => scrollY); await page.click('#bottomNav .bn-btn[data-sec=reading]'); await page.waitForTimeout(800);
{ const y = await page.evaluate(() => scrollY); if (yb < 1000 || y !== 0) bad(`点底栏切版块后不在顶部：${yb} -> ${y}`); }
await page.evaluate(() => scrollTo(0, 2000)); await page.waitForTimeout(300); await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
{ const y = await page.evaluate(() => scrollY); if (y !== 0) bad('刷新后不在顶部：' + y); }
await b.close(); srv.close();
if (fail) { console.error(`✗ 切页回顶：${fail} 处失败`); process.exit(1); }
console.log('✓ 切页回顶：版块切换 / 版块内切换 9 处 / 返回还原 / 刷新 全部通过');
