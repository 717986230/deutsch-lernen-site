// 测验页「错题库」：答错自动记、答对自动摘，练一个少一个。
//
// 这份数据和「拼写记忆」的错词本共用同一个 localStorage 键（spWrong_de/spWrong_en），
// 复用 _spWrongGet/_spWrongSave，不新增存储系统、不新增跨端同步字段。
// 这里验证的是错题库特有的生命周期，不是选项转义（那部分 verify-quiz-safe-html.mjs 已覆盖）：
//   ① 错题库为空时点卡片：不崩、不真的进入测验
//   ② 词汇类测验答错：不用手动点「拼写巩固错词」，当场自动写进错题库
//   ③ 在任意模式答对一个原本在错题库里的词：立刻从错题库摘除
//   ④ 错题库模式本身：出题范围只在错题库里，四选一里有且只有一个 data-correct
//   ⑤ 带撇号/引号的词进错题库也一样安全（选项渲染复用同一套 data-correct 机制）
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8741;
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
if (!browserEnv) { skipNoBrowser('错题库体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.addInitScript(() => { try { localStorage.setItem('acct_token', 't1'); } catch (e) {} });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => showSection('quiz'));
await page.addStyleTag({ content: '#boostModal{display:none!important}' });

// ── ① 错题库为空：点卡片不该真的进入测验、不该抛错 ──
const r1 = await page.evaluate(() => {
  try { localStorage.removeItem('spWrong_de'); } catch (e) {}
  updateQuizWrongSub();
  const subBefore = document.getElementById('qdWrong').textContent;
  startQuiz('wrongbook');
  return { subBefore, enteredQuiz: !!document.querySelector('#mainQuizArea .quiz-box') };
});
if (r1.enteredQuiz) bad('错题库为空时点「错题库」卡片，仍然进入了测验（应该被挡住并提示）');
if (!/暂无错题/.test(r1.subBefore)) bad(`错题库为空时卡片文案不对："${r1.subBefore}"`);

// ── ② 词汇类测验答错 → 当场自动写进 spWrong，不需要手动点「拼写巩固错词」──
const r2 = await page.evaluate(() => {
  try { localStorage.removeItem('spWrong_de'); } catch (e) {}
  mq = { score: 0, total: 0, mode: 'phrase', current: null, roundLen: 10, wrong: [] };
  const real = window.getAllPhrases;
  window.getAllPhrases = () => [
    { de: "Mach's gut!", zh: '保重！', id: 'w-0' },
    { de: 'Tschüss!', zh: '再见！', id: 'w-1' },
    { de: 'Danke.', zh: '谢谢。', id: 'w-2' },
    { de: 'Bitte.', zh: '请。', id: 'w-3' },
  ];
  nextQ();
  const box = document.getElementById('mainQuizArea');
  const correctBtn = box.querySelector('.quiz-opt[data-correct="1"]');
  const wrongBtn = [...box.querySelectorAll('.quiz-opt')].find((b) => b !== correctBtn);
  const target = mq.current.de;
  wrongBtn.click();
  window.getAllPhrases = real;
  const stored = JSON.parse(localStorage.getItem('spWrong_de') || '{}');
  return { target, autoStored: !!stored[target], subAfter: document.getElementById('qdWrong').textContent };
});
if (!r2.autoStored) bad(`答错「${r2.target}」后没有自动写进错题库（spWrong_de）`);
if (!/已收录 1 个错题/.test(r2.subAfter)) bad(`答错后卡片文案没跟着更新："${r2.subAfter}"`);

await page.waitForTimeout(1700);

// ── ③ 用「错题库」模式练，四选一里必须有且只有一个 data-correct，且出的题在错题库范围内 ──
const r3 = await page.evaluate(() => {
  const m = { "Mach's gut!": { zh: '保重！', py: 'x' }, "Wie geht's?": { zh: '咋样？', py: 'y' }, 'a"b': { zh: '带引号的', py: 'z' } };
  localStorage.setItem('spWrong_de', JSON.stringify(m));
  updateQuizWrongSub();
  const subBefore = document.getElementById('qdWrong').textContent;
  startQuiz('wrongbook');
  const box = document.getElementById('mainQuizArea');
  const opts = [...box.querySelectorAll('.quiz-opt')];
  const correctBtns = opts.filter((b) => b.getAttribute('data-correct') === '1');
  return { subBefore, mode: mq.mode, roundLen: mq.roundLen, optsN: opts.length, correctN: correctBtns.length, inPool: Object.keys(m).includes(mq.current && mq.current.de) };
});
if (!/已收录 3 个错题/.test(r3.subBefore)) bad(`有 3 条错题时卡片文案不对："${r3.subBefore}"`);
if (r3.mode !== 'wrongbook') bad('startQuiz(\'wrongbook\') 之后 mq.mode 不是 wrongbook');
if (r3.optsN !== 4) bad(`错题库模式选项数应为 4，实际 ${r3.optsN}`);
if (r3.correctN !== 1) bad(`错题库模式应有且只有 1 个 data-correct 选项，实际 ${r3.correctN}`);
if (!r3.inPool) bad('错题库模式出的题不在错题库范围内');

// ── ④ 答对错题库里的词 → 立刻摘除、subtitle 同步减少 ──
const r4 = await page.evaluate(() => {
  const beforeN = Object.keys(JSON.parse(localStorage.getItem('spWrong_de') || '{}')).length;
  const box = document.getElementById('mainQuizArea');
  const correctBtn = box.querySelector('.quiz-opt[data-correct="1"]');
  const answered = mq.current.de;
  correctBtn.click();
  const afterMap = JSON.parse(localStorage.getItem('spWrong_de') || '{}');
  return { beforeN, afterN: Object.keys(afterMap).length, stillThere: !!afterMap[answered], sub: document.getElementById('qdWrong').textContent };
});
if (r4.stillThere) bad('答对了错题库里的词，但它还留在 spWrong 里没被摘除');
if (r4.afterN !== r4.beforeN - 1) bad(`答对一题后错题库条数应该 -1，实际 ${r4.beforeN} → ${r4.afterN}`);
if (!/已收录 2 个错题/.test(r4.sub)) bad(`答对摘除后卡片文案没跟着更新："${r4.sub}"`);

// ── ⑤ 图卡测验也进错题本 ──
// 图卡题走的是另一条代码路径（boardAns，不经过 checkQ），一开始压根没接错题本：
// 228 个图卡词答错什么都不留，练了白练。这里逐板验一遍「答错收录、答对摘除」。
// 特别盯 py：_boardItems() 原来只取 de/zh/em，漏了谐音，收录进去就是半条记录。
const boards = await page.evaluate(() => PIC_BOARDS.map((b) => ({ id: b.id, name: b.name })));
let bChecked = 0;
for (const brd of boards) {
  const r = await page.evaluate(async (id) => {
    const wait = (ms) => new Promise((r2) => setTimeout(r2, ms));
    localStorage.setItem('spWrong_de', '{}');
    showSection('body'); await wait(200);
    switchBoard(id); await wait(250);
    const items = _boardItems();
    const out = { noPy: items.filter((x) => !x.py).map((x) => x.de).slice(0, 3) };
    const box = () => document.getElementById('boardQuiz');
    const target = () => {
      const zh = box().querySelector('div[style*="font-weight:600"]').textContent;
      return items.find((i) => i.zh === zh);
    };
    // 答错 → 收录
    buildBoardQuiz();
    let t = target();
    [...box().querySelectorAll('.gq-opt')].find((o) => o.textContent !== t.de).click();
    await wait(30);
    const m1 = JSON.parse(localStorage.getItem('spWrong_de') || '{}');
    out.收录 = m1[t.de] || null;
    out.词 = t.de;
    // 同一个词答对 → 摘除
    let g = 0, hit = false;
    while (g++ < 400 && !hit) {
      buildBoardQuiz();
      const t2 = target();
      if (t2.de !== t.de) continue;
      [...box().querySelectorAll('.gq-opt')].find((o) => o.textContent === t2.de).click();
      await wait(30); hit = true;
    }
    out.重出到 = hit;
    out.摘除后还在 = !!JSON.parse(localStorage.getItem('spWrong_de') || '{}')[t.de];
    return out;
  }, brd.id);
  if (r.noPy.length) bad(`图卡「${brd.name}」有词没带谐音：${r.noPy.join('、')} —— 收进错题本会是半条记录`);
  if (!r.收录) bad(`图卡「${brd.name}」答错「${r.词}」没有写进错题本`);
  else {
    if (!r.收录.zh) bad(`图卡「${brd.name}」错题本里「${r.词}」缺中文`);
    if (!r.收录.py) bad(`图卡「${brd.name}」错题本里「${r.词}」缺谐音`);
  }
  if (!r.重出到) bad(`图卡「${brd.name}」400 次出题都没再抽到「${r.词}」，答对摘除这一路没验到`);
  else if (r.摘除后还在) bad(`图卡「${brd.name}」答对「${r.词}」后它还留在错题本里`);
  bChecked++;
}

for (const e of errs) bad('页面抛错：' + e);

await browser.close();
srv.close();
console.log(`错题库体检：空库拦截 · 答错自动记 · 答对自动摘 · 错题库模式只出错题范围内的题`
  + ` · 图卡测验 ${bChecked} 个板各验一遍收录与摘除`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 错题库生命周期正确，答错自动记、答对自动摘，且不会把测验炸崩');
