// 全站公告（src.html 里的 ANNOUNCE，一次性弹窗）体检。
//   ① 登录后弹出，且不和「上新了」提示条叠在一起；
//   ② 点「联系作者」跳到「支持作者」页并把联系方式滚进视口；点「看看排行榜」到 rank；
//   ③ every:true 时刷新后再次弹出；否则弹过一次就记进 annSeen，刷新不再出现（×/遮罩关闭同样）；
//   ④ 深浅两套主题下弹窗都在视口内；全程 pageerror 为 0。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
if (/var ANNOUNCE=null/.test(src)) { console.log('OK 全站公告：当前没有公告（ANNOUNCE=null）'); process.exit(0); }

const EVERY = /var ANNOUNCE=\{[^}]*every:true/.test(src);
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

async function open(theme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await page.addInitScript(() => { try { localStorage.setItem('acct_token', 't1'); } catch (e) {} });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  return { ctx, page };
}
async function shown(page) {
  try { await page.waitForSelector('.ann-ov', { timeout: 4000 }); return true; } catch { return false; }
}

for (const [theme, how] of [['light', 'contact'], ['dark', 'rank'], ['light', 'x'], ['light', 'mask']]) {
  const { ctx, page } = await open(theme);
  if (!(await shown(page))) { bad(`${theme}/${how}：登录后没弹出公告`); await ctx.close(); continue; }
  const r = await page.evaluate(() => {
    const b = document.querySelector('.ann-sheet').getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, bar: !!document.querySelector('.wn-bar') };
  });
  if (r.top < 0 || r.bottom > 844 || r.left < 0 || r.right > 390) bad(`${theme}：弹窗超出视口 ${JSON.stringify(r)}`);
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
  if (EVERY && !again) bad(`${theme}/${how}：刷新后公告没再弹（every:true 应每次打开都弹）`);
  if (!EVERY && again) bad(`${theme}/${how}：刷新后公告又弹了（应只弹一次）`);
  await ctx.close();
}
for (const e of new Set(errs)) bad('页面抛错：' + e);
await browser.close(); srv.close();
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log(`OK 全站公告：登录后弹出、两个按钮能到位、${EVERY ? '每次打开都弹' : '关闭后不再弹'}`);
