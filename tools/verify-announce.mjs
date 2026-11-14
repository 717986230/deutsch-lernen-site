// 全站公告弹窗体检。2026-11-14 起公告内容来自后端 GET /api/announce（站长在 stats.html 编辑发布），
// 这里用 Playwright 的 route 把它答成指定公告：
//   ① 登录后弹出，且不和「上新了」提示条叠在一起；
//   ② 点「联系作者」跳到「支持作者」页并把联系方式滚进视口；点「看看排行榜」到 rank；
//   ③ every:true 刷新后再次弹出；every:false 弹过一次就记进 annSeen，刷新不再出现（×/遮罩关闭同样）；
//   ④ 深浅两套主题下弹窗都在视口内；正文 **加粗** 生效、HTML 被转义、站外按钮被丢弃；
//   ⑤ 后端说没有公告（null）不弹；后端不通时用上次缓存；?annpreview=1 弹 localStorage.annDraft 草稿且不记看过；
//   全程 pageerror 为 0。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const ANN = { id: 'a-test1', every: true, icon: '🏆', title: '榜单前三送年卡',
  body: '第一段 **重点** 文字\n\n第二段<img src=x onerror="window.__xss=1">\n换行', contact: true,
  btns: [{ t: '联系作者', go: 'support' }, { t: '看看排行榜 ›', go: 'rank' }, { t: '坏', go: 'javascript:alert(1)' }] };
const PORT = 8753;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.dat': 'application/octet-stream' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));
const env = await getChromium();
if (!env) { skipNoBrowser('全站公告'); srv.close(); process.exit(0); }
const browser = await env.chromium.launch(env.launch);
const errs = [];

async function open(theme, ann, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await page.addInitScript((o) => { try { localStorage.setItem('acct_token', 't1'); if (o.draft) localStorage.setItem('annDraft', JSON.stringify(o.draft)); } catch (e) {} }, opt);
  const state = { ann, down: !!opt.down };
  await page.route('**/api/announce', (r) => (state.down ? r.abort() : r.fulfill({ json: { ann: state.ann, updated: 1 } })));
  await page.goto(`http://localhost:${PORT}/index.html${opt.qs || ''}`, { waitUntil: 'networkidle' });
  return { ctx, page, state };
}
async function shown(page) {
  try { await page.waitForSelector('.ann-ov', { timeout: 4000 }); return true; } catch { return false; }
}

for (const [theme, how, every] of [['light', 'contact', true], ['dark', 'rank', true], ['light', 'x', false], ['light', 'mask', false]]) {
  const ann = Object.assign({}, ANN, { every, id: 'a-' + how });
  const { ctx, page } = await open(theme, ann);
  if (!(await shown(page))) { bad(`${theme}/${how}：登录后没弹出公告`); await ctx.close(); continue; }
  const r = await page.evaluate(() => {
    const b = document.querySelector('.ann-sheet').getBoundingClientRect();
    const body = document.querySelector('.ann-body');
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, bold: (body.querySelector('b') || {}).textContent,
      img: !!body.querySelector('img'), xss: !!window.__xss, ps: body.querySelectorAll('p').length, br: body.querySelectorAll('br').length,
      btns: [...document.querySelectorAll('.ann-btns button')].map((x) => x.textContent), qq: !!body.querySelector('.ann-qq') };
  });
  if (r.top < 0 || r.bottom > 844 || r.left < 0 || r.right > 390) bad(`${theme}：弹窗超出视口 ${JSON.stringify(r)}`);
  if (r.bold !== '重点' || r.ps !== 2 || r.br < 1) bad(`正文分段/加粗/换行不对：${JSON.stringify(r)}`);
  if (r.img || r.xss) bad('正文里的 HTML 没被转义');
  if (r.btns.join('|') !== '联系作者|看看排行榜 ›') bad('按钮应只剩两个站内按钮：' + r.btns.join('|'));
  if (!r.qq) bad('contact:true 时应显示 QQ 联系框');
  await page.waitForTimeout(1500);
  if (await page.$('.wn-bar')) bad(`${theme}：公告开着时「上新了」提示条也出来了`);
  if (how === 'contact') {
    await page.click('.ann-b2'); await page.waitForTimeout(700);
    const s = await page.evaluate(() => {
      const el = document.getElementById('contactAuthor'), b = el && el.getBoundingClientRect();
      return { sec: (document.querySelector('.section.active') || {}).id, vis: !!b && b.top >= 0 && b.bottom <= innerHeight };
    });
    if (s.sec !== 'support' || !s.vis) bad(`「联系作者」没把联系方式带进视口：${JSON.stringify(s)}`);
  } else if (how === 'rank') {
    await page.click('.ann-b1'); await page.waitForTimeout(500);
    const sec = await page.evaluate(() => (document.querySelector('.section.active') || {}).id);
    if (sec !== 'rank') bad(`「看看排行榜」没切到排行榜（${sec}）`);
  } else if (how === 'x') {
    await page.click('.ann-sheet .wn-x');
  } else {
    await page.mouse.click(195, 20);
  }
  await page.waitForTimeout(300);
  if (await page.$('.ann-ov')) bad(`${theme}/${how}：关闭后弹窗还在`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const again = !!(await page.$('.ann-ov'));
  if (every && !again) bad(`${theme}/${how}：刷新后公告没再弹（every:true 应每次打开都弹）`);
  if (!every && again) bad(`${theme}/${how}：刷新后公告又弹了（应只弹一次）`);
  await ctx.close();
}

// 后端说没有公告：不弹
{
  const { ctx, page } = await open('light', null);
  await page.waitForTimeout(1500);
  if (await page.$('.ann-ov')) bad('后端 ann=null 时不应弹公告');
  await ctx.close();
}
// 后端不通：用上次缓存
{
  const { ctx, page, state } = await open('light', Object.assign({}, ANN, { id: 'a-cache' }));
  if (!(await shown(page))) bad('缓存场景：第一次没弹');
  state.down = true;
  await page.reload({ waitUntil: 'networkidle' });
  if (!(await shown(page))) bad('后端不通时没用上次缓存的公告');
  await ctx.close();
}
// 站长预览草稿：不需要后端、不记看过；没按钮时给「知道了」
{
  const draft = { every: false, id: 'draft', icon: '📢', title: '草稿标题', body: '草稿正文', btns: [] };
  const { ctx, page } = await open('dark', null, { draft, qs: '?annpreview=1' });
  if (!(await shown(page))) bad('?annpreview=1 没弹出草稿');
  else {
    const t = await page.evaluate(() => [document.getElementById('annTitle').textContent, [...document.querySelectorAll('.ann-btns button')].map((x) => x.textContent).join('|'), localStorage.getItem('annSeen')]);
    if (!t[0].includes('预览') || !t[0].includes('草稿标题')) bad('预览标题不对：' + t[0]);
    if (t[1] !== '知道了') bad('没配按钮时应只有「知道了」：' + t[1]);
    if (t[2] && t[2].includes('draft')) bad('预览不应记进 annSeen');
    await page.click('.ann-b1'); await page.waitForTimeout(300);
    if (await page.$('.ann-ov')) bad('点「知道了」没关掉');
  }
  await ctx.close();
}
for (const e of new Set(errs)) bad('页面抛错：' + e);
await browser.close(); srv.close();
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 全站公告：后端下发、按钮到位、每次弹/只弹一次、缓存兜底、草稿预览都正常');
