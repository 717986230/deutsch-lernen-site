// 进站第一眼体检：冷启动不弹报错、深链不被弹窗挡、弹窗能 Esc 关。
//
// 起因（2026-10 对照多邻国等热门站优化）：
//   ① 「每日一句」弹窗一弹出就无条件 speakDE —— 冷启动没有用户手势，浏览器拒绝朗读，
//      于是每个人进站第一眼就是一条「浏览器拦住了自动朗读」的报错提示。
//   ② 分享出来的 #reading 等深链，点进来也被整屏弹窗挡住。
//   ③ 弹窗不响应 Esc（同页的拼读器弹窗是响应的）。
// 2026-10-30 站长嫌东西太多：「每日一句」不再弹窗，改成首页里的一张卡。
//   现在验的是：任何入口都没有整屏弹层、冷启动不自动朗读、首页卡片有句子。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8751;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.dat': 'application/octet-stream' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));
const env = await getChromium();
if (!env) { skipNoBrowser('进站体检'); srv.close(); process.exit(0); }
const browser = await env.chromium.launch(env.launch);

async function visit(hash) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await page.addInitScript(() => {
    localStorage.setItem('acct_token', 't1');
    // 不桩 speechSynthesis：Chromium 本身就执行自动播放策略，无手势朗读会以 not-allowed 失败
  });
  await page.goto(`http://localhost:${PORT}/index.html${hash}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window._DEC, null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const st = await page.evaluate(() => {
    const t = document.getElementById('__ttsh');
    return { overlay: !!document.querySelector('.boost-overlay'),
      toast: t && getComputedStyle(t).display !== 'none' && getComputedStyle(t).opacity !== '0' ? t.textContent : '' };
  });
  return { page, st, errs };
}

for (const hash of ['', '#reading']) {
  const { page, st, errs } = await visit(hash);
  if (st.overlay) bad(`${hash || '正常打开'}：还有「每日一句」整屏弹层`);
  if (st.toast) bad(`${hash || '正常打开'}：冷启动就弹出提示「${st.toast}」—— 无手势时不该自动朗读`);
  if (!hash) {
    await page.evaluate(() => showSection('home'));
    await page.waitForTimeout(400);
    const de = await page.evaluate(() => { const b = document.getElementById('homeBoost'); return b && b.style.display !== 'none' ? document.getElementById('boostDe').textContent : ''; });
    if (!de) bad('首页没有显示「每日一句」卡片');
  }
  for (const e of new Set(errs)) bad('页面抛错：' + e);
  await page.close();
}
await browser.close(); srv.close();
console.log('进站体检：冷启动无报错提示 · 无弹窗 · 首页有每日一句');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 进站第一眼干净');
