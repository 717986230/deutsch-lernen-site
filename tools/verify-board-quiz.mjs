// 图卡测验「✏️ 看图选德语」的出题质量体检。
//
// 起因：用户反馈「看图选单词有不对的」。判分逻辑其实没问题（实测 200 题全对），
// 真正的毛病在出题：图卡里 💪 同时是肩膀/上臂/手肘/手臂，🦵 同时是大腿/膝盖/
// 小腿/小腿肚，🦶 同时是脚踝/脚/脚趾。一旦四个选项里有两个顶着同一张图，
// 这道「看图选」就真的没法看图作答 —— 实测 200 题里有 17 题（8.5%）如此。
//
// 光看代码看不出来（选项是随机抽的），所以在真浏览器里连抽几百题，
// 对每道题断言：四个选项互不相同、正确答案的图在四项中唯一、点对判对、点错判错。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8736;
const ROUNDS = 160;              // 每个板抽这么多题
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
if (!browserEnv) { skipNoBrowser('图卡测验体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.addInitScript(() => {
  localStorage.setItem('acct_token', 't1');
  const real = window.fetch;
  window.fetch = function (u) {
    const s = String(u);
    const j = (x) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
    if (s.indexOf('/api/') >= 0) return j({ user: { username: 'u1' }, rank: 1, rev: 1, document: {}, list: [], total: 0, badges: [] });
    return real.apply(this, arguments);
  };
  if (window.speechSynthesis) window.speechSynthesis.speak = function () {};
});
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => showSection('body'));
await page.waitForTimeout(400);

const boards = await page.evaluate(() => PIC_BOARDS.map((b) => ({ id: b.id, name: b.name })));
let asked = 0;
for (const brd of boards) {
  const r = await page.evaluate(([id, ROUNDS]) => {
    switchBoard(id);
    const items = _boardItems();
    const out = { n: 0, few: 0, dupOpt: [], ambig: [], misgrade: [] };
    if (items.length < 4) return out;
    for (let k = 0; k < ROUNDS; k++) {
      buildBoardQuiz();
      const box = document.getElementById('boardQuiz');
      const opts = [...box.querySelectorAll('.gq-opt')];
      if (opts.length < 4) { out.few++; continue; }
      const zh = box.querySelector('div[style*="font-weight:600"]').textContent;
      const em = box.querySelector('span[style*="font-size:46px"]').textContent;
      const texts = opts.map((o) => o.textContent);
      out.n++;
      if (new Set(texts).size !== texts.length && out.dupOpt.length < 3) out.dupOpt.push(zh + ' → ' + texts.join(' / '));
      // 正确答案那张图，在四个选项里必须只对应一个词，否则「看图」这一步是假的
      const same = texts.filter((t) => { const it = items.find((i) => i.de === t); return it && it.em === em; });
      if (same.length > 1 && out.ambig.length < 3) out.ambig.push(em + ' ' + zh + ' → ' + texts.join(' / '));
      const target = items.find((i) => i.zh === zh);
      const correct = opts.find((o) => o.textContent === target.de);
      const pick = (k % 2 === 0) ? correct : opts.find((o) => o !== correct);
      pick.click();
      const okMsg = box.querySelector('.gq-score').textContent.indexOf('答对了') >= 0;
      if ((pick === correct) !== okMsg && out.misgrade.length < 3) {
        out.misgrade.push(`${zh}：点了「${pick.textContent}」，正确是「${target.de}」，判定${okMsg ? '对' : '错'}`);
      }
    }
    return out;
  }, [brd.id, ROUNDS]);
  asked += r.n;
  if (r.few) bad(`${brd.name}：${r.few} 题凑不满 4 个选项`);
  r.dupOpt.forEach((x) => bad(`${brd.name} 选项重复：${x}`));
  r.ambig.forEach((x) => bad(`${brd.name} 图标指不明：${x}`));
  r.misgrade.forEach((x) => bad(`${brd.name} 判分错：${x}`));
}
for (const e of errs) bad(`页面抛错：${e}`);

await browser.close();
srv.close();
console.log(`图卡测验体检：${boards.length} 个板 × ${ROUNDS} 题，实际出题 ${asked} 道`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 每题四选项互不相同、图标能唯一指认答案、判分正确');
