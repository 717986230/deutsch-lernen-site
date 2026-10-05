// 进站第一眼体检：冷启动不弹报错、深链不被弹窗挡、弹窗能 Esc 关。
//
// 起因（2026-10 对照多邻国等热门站优化）：
//   ① 「每日一句」弹窗一弹出就无条件 speakDE —— 冷启动没有用户手势，浏览器拒绝朗读，
//      于是每个人进站第一眼就是一条「浏览器拦住了自动朗读」的报错提示。
//   ② 分享出来的 #reading 等深链，点进来也被整屏弹窗挡住。
//   ③ 弹窗不响应 Esc（同页的拼读器弹窗是响应的）。
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
    return { modal: getComputedStyle(document.getElementById('boostModal')).display,
      toast: t && getComputedStyle(t).opacity !== '0' ? t.textContent : '' };
  });
  return { page, st, errs };
}

{
  const { page, st, errs } = await visit('');
  if (st.modal !== 'flex') bad('正常打开时「每日一句」没有弹出');
  if (st.toast) bad(`冷启动就弹出提示「${st.toast}」—— 无手势时不该自动朗读`);
  await page.keyboard.press('Escape');
  if (await page.evaluate(() => getComputedStyle(document.getElementById('boostModal')).display) !== 'none') bad('按 Esc 关不掉「每日一句」弹窗');
  for (const e of new Set(errs)) bad('页面抛错：' + e);
  await page.close();
}
{
  const { page, st, errs } = await visit('#reading');
  if (st.modal !== 'none') bad('从 #reading 深链进站，被「每日一句」弹窗挡住了');
  for (const e of new Set(errs)) bad('页面抛错：' + e);
  await page.close();
}
await browser.close(); srv.close();
console.log('进站体检：冷启动无报错提示 · 深链不弹窗 · Esc 可关');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 进站第一眼干净');
