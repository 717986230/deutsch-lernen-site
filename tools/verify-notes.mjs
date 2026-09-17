// 学习笔记体检。
//
// 笔记是 AGENTS.md §1.3「不做 UGC」的**唯一例外**，能成立只因为两条硬承诺：
//   · 永远只给自己看 —— 不出现在任何别人能看到的地方，所以零审核负担
//   · 用户文本永远不变成 DOM —— 站里 _esc() 不转义单引号（为此踩过坑），
//     所以笔记一律走 textContent，一个字符都不拼进 innerHTML
// 这两条一旦破了，「加笔记」就变成了「加评论」，性质完全不同。所以这里逐条钉死。
//
// 另外盯两道上限：笔记跟着 _progressDoc() 整包 PUT 到 D1，不封顶的话
// 一个用户就能把同步文档撑到几 MB，之后每次同步都要整包来回传。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8747;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.dat': 'application/octet-stream', '.css': 'text/css' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const browserEnv = await getChromium();
if (!browserEnv) { skipNoBrowser('学习笔记体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
// 所有 /api/ 请求记一笔，后面要断言笔记内容只出现在 /api/progress 里
await page.addInitScript(() => {
  try { localStorage.setItem('acct_token', 't1'); } catch (e) {}
  if (window.speechSynthesis) window.speechSynthesis.speak = function () {};
  window.__calls = [];
  const real = window.fetch;
  window.fetch = function (u, o) {
    const s = String(u);
    if (s.indexOf('/api/') >= 0) {
      window.__calls.push({ url: s, body: String((o && o.body) || '') });
      const j = { user: { username: 'u1', nickname: 'u1' }, rank: 1, rev: 1, document: {}, list: [], total: 0, badges: [], followers: 0, following: 0 };
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(j); } });
    }
    return real.apply(this, arguments);
  };
});
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC, null, { timeout: 20000 }).catch(() => {});
await page.addStyleTag({ content: '#boostModal{display:none!important}' });

// 挑几个最阴的载荷：单引号是重点（_esc 不转义它）
const PAYLOADS = [
  '<img src=x onerror="window.__pwned=1">',
  "');window.__pwned=1;//",
  '<script>window.__pwned=1<\/script>',
  '"><b>bold</b> & <i>it</i>',
  "it's a 'test' \"quoted\"",
];

// ── ① 卡片上的开合与写入，② 用户文本永不变成 DOM ──
const r1 = await page.evaluate(async (PAYLOADS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  localStorage.removeItem('notes_de');
  showSection('phrases'); await wait(900);
  const card = document.querySelector('#phraseContent .card');
  const de = card.querySelector('.card-de').textContent;
  const out = { de, cases: [], flipped: false, toggles: 0 };
  // 点 📝 不能把卡片翻面（卡片本身有翻面点击）
  card.querySelector('.note-btn').click(); await wait(50);
  out.flipped = card.classList.contains('flipped');
  out.editorOpen = !!card.querySelector('textarea.note-input');
  card.querySelector('.note-btn').click(); await wait(50);   // 再点＝收起
  out.editorClosed = !card.querySelector('textarea.note-input');
  for (const p of PAYLOADS) {
    noteSet(de, p);
    noteRender(card, de);
    const body = card.querySelector('.card-note .note-body');
    out.cases.push({
      p,
      stored: (JSON.parse(localStorage.getItem('notes_de') || '{}')[de] || {}).t,
      shown: body ? body.textContent : null,
      // 关键：笔记区里不许因为笔记内容凭空多出任何元素
      elems: body ? body.querySelectorAll('*').length : -1,
      pwned: !!window.__pwned,
    });
  }
  return out;
}, PAYLOADS);
if (r1.flipped) bad('点 📝 把卡片翻面了 —— 编辑笔记时卡片不该跟着翻');
if (!r1.editorOpen) bad('点 📝 没有打开笔记编辑器');
if (!r1.editorClosed) bad('再点一次 📝 没有收起编辑器');
for (const c of r1.cases) {
  if (c.pwned) bad(`笔记内容被当成代码执行了：${c.p}`);
  if (c.stored !== c.p) bad(`笔记存进去就变了样：写「${c.p}」存成「${c.stored}」`);
  if (c.shown !== c.p) bad(`笔记显示出来和写的不一样：写「${c.p}」显示「${c.shown}」`);
  if (c.elems !== 0) bad(`笔记「${c.p}」在页面上生成了 ${c.elems} 个元素 —— 用户文本必须走 textContent`);
}

// ── ③ 两道上限 ──
const r2 = await page.evaluate(() => {
  localStorage.removeItem('notes_de');
  const out = {};
  noteSet('W', 'x'.repeat(NOTE_MAX + 300));
  out.max = NOTE_MAX; out.truncated = noteText('W').length;
  for (let i = 0; i < NOTE_CAP + 20; i++) noteSet('w' + i, 'n');
  out.cap = NOTE_CAP;
  out.stored = Object.keys(JSON.parse(localStorage.getItem('notes_de') || '{}')).length;
  out.refused = noteSet('再来一条', 'x');
  // 已存在的那条即使到了上限也要能改
  out.editExisting = noteSet('w0', '改过了');
  out.edited = noteText('w0');
  // 清空＝删除
  noteSet('w0', '');
  out.cleared = !noteText('w0');
  return out;
});
if (r2.truncated !== r2.max) bad(`单条笔记应截断到 ${r2.max} 字，实际 ${r2.truncated}`);
if (r2.stored > r2.cap) bad(`笔记条数上限 ${r2.cap}，实际存下了 ${r2.stored} 条`);
if (r2.refused.ok) bad('到达条数上限后仍然允许新增笔记');
if (!r2.editExisting.ok || r2.edited !== '改过了') bad('到达条数上限后，连改已有的笔记都被挡住了');
if (!r2.cleared) bad('把笔记清空后它没有被删除');

// ── ④ 同步：进得了进度文档，合并按时间戳 ──
const r3 = await page.evaluate(() => {
  localStorage.setItem('notes_de', JSON.stringify({ A: { t: '本地', ts: 100 } }));
  const out = { inDoc: Object.keys(_progressDoc().notes || {}).length };
  out.newerWins = _progressMerge({ notes: { A: { t: '旧', ts: 100 } } }, { notes: { A: { t: '新', ts: 200 } } }).notes.A.t;
  out.olderLoses = _progressMerge({ notes: { A: { t: '新', ts: 200 } } }, { notes: { A: { t: '旧', ts: 100 } } }).notes.A.t;
  out.unionKeeps = Object.keys(_progressMerge({ notes: { A: { t: 'a', ts: 1 } } }, { notes: { B: { t: 'b', ts: 1 } } }).notes).sort().join(',');
  // 拉下来的远端文档要真的落盘
  _progressApply({ notes: { Z: { t: '远端来的', ts: 999 } } });
  out.applied = JSON.parse(localStorage.getItem('notes_de') || '{}').Z;
  return out;
});
if (!r3.inDoc) bad('_progressDoc() 里没有 notes —— 笔记不会跨设备同步');
if (r3.newerWins !== '新') bad(`合并冲突时应该晚的赢，实际留下「${r3.newerWins}」`);
if (r3.olderLoses !== '新') bad(`合并时旧版本覆盖了新版本，留下「${r3.olderLoses}」`);
if (r3.unionKeeps !== 'A,B') bad(`合并丢了条目：期望 A,B，实际 ${r3.unionKeeps}`);
if (!r3.applied) bad('_progressApply 没有把远端的笔记写进本地');

// ── ⑤ 核心承诺：笔记内容只许出现在 /api/progress，别的接口一概不带 ──
const MARK = 'NOTE_SECRET_ZZZ_9137';
const r4 = await page.evaluate(async (MARK) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  localStorage.setItem('notes_de', JSON.stringify({ A: { t: MARK, ts: 1 } }));
  window.__calls = [];
  // 把所有会发请求的公开面都走一遍
  showSection('rank'); await wait(400);
  try { rankScope('friends'); } catch (e) {} await wait(300);
  try { rankScope('feed'); } catch (e) {} await wait(300);
  try { rankScope('all'); } catch (e) {} await wait(200);
  showSection('me'); await wait(500);
  try { openProfile('u1'); } catch (e) {} await wait(400);
  try { acctSync(true); } catch (e) {} await wait(500);
  return window.__calls.map((c) => ({ url: c.url.split('?')[0], leaks: c.body.indexOf(MARK) >= 0 }));
}, MARK);
const leaked = r4.filter((c) => c.leaks && c.url.indexOf('/api/progress') < 0);
if (leaked.length) {
  bad(`笔记内容出现在了非同步接口的请求里：${[...new Set(leaked.map((c) => c.url))].join('、')}`
    + ' —— 笔记只许走 /api/progress，绝不能流向任何公开面');
}
if (!r4.length) bad('一个 /api 请求都没抓到 —— 这道「不外泄」检查等于没跑，先确认探针有效');

// ── ⑥ 「我的」页汇总与删除 ──
const r5 = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  localStorage.setItem('notes_de', JSON.stringify({
    'der Hund': { t: '狗 <b>不该加粗</b>', ts: 2 }, 'die Katze': { t: '猫', ts: 1 },
  }));
  showSection('me'); await wait(400);
  const el = document.getElementById('meNotes');
  const out = { rows: el.querySelectorAll('.note-item').length,
    firstDe: (el.querySelector('.note-item b') || {}).textContent,
    firstBody: (el.querySelector('.note-item .note-body') || {}).textContent,
    elemsInBody: el.querySelectorAll('.note-item .note-body *').length };
  // 汇总页删除
  [...el.querySelectorAll('.note-item .note-del')][0].click(); await wait(200);
  out.afterDel = document.getElementById('meNotes').querySelectorAll('.note-item').length;
  // 清空后给空态而不是一片白
  localStorage.setItem('notes_de', '{}');
  renderMyNotes();
  out.emptyText = document.getElementById('meNotes').textContent.indexOf('还没有笔记') >= 0;
  return out;
});
if (r5.rows !== 2) bad(`「我的」页应列出 2 条笔记，实际 ${r5.rows} 条`);
if (r5.firstDe !== 'der Hund') bad(`笔记汇总没有按最近修改排序（第一条是「${r5.firstDe}」）`);
if (r5.elemsInBody !== 0) bad(`笔记汇总里的用户文本生成了 ${r5.elemsInBody} 个元素 —— 必须走 textContent`);
if (r5.afterDel !== 1) bad(`在汇总页删除一条后应剩 1 条，实际 ${r5.afterDel} 条`);
if (!r5.emptyText) bad('笔记清空后「我的」页没有给空态提示');

for (const e of errs) bad('页面抛错：' + e);
await browser.close(); srv.close();
console.log(`学习笔记体检：${PAYLOADS.length} 种注入载荷 · 单条 ${r2.max} 字/共 ${r2.cap} 条两道上限 · `
  + `同步合并按时间戳 · 扫了 ${r4.length} 个 /api 请求确认笔记不外泄 · 汇总页增删与空态`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 笔记只进 textContent、只走同步接口、上限生效');
