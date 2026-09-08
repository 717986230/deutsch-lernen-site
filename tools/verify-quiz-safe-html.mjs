// 测验选项不能因为词库里的撇号把整道题炸掉。
//
// 起因：线上真出过事故——诊断红条报
//   ⚠️ 脚本出错（请截图发我）
//   Uncaught SyntaxError: missing ) after argument list
//   @https://www.uuoo.site/#quiz 1:32
// 根因：选项按钮曾经是 onclick="checkQ(this,'${escQ(o.de)}','${escQ(mq.current.de)}')"。
// escQ() 用 HTML 实体转义单引号（' → &#39;），但 onclick="..." 是个**双引号属性**——
// HTML 解析器会在把属性值交给 JS 解析器之前，先把 &#39;/&quot; 解码回真正的引号。
// 词库里 "Mach's gut!"／"Wie geht's?" 这种带撇号的词一旦被抽成选项，
// 解码复原后的撇号就把 checkQ(this,'...') 的参数字符串截断，抛出上面那句话——
// 而且这题直接卡死，因为 checkQ 根本没跑起来，分数不涨、也翻不到下一题。
//
// 修法是不再把词的原文塞进 onclick 的 JS 字符串参数：选项按钮只用 data-correct
// 标记"这个是对的"，checkQ 系列直接比按钮而非比文本；词的原文只作为
// _esc() 转义过的 HTML 文本内容出现，压根不进 JS 代码，这个 bug 类就整个不存在了。
//
// 这里把词库整个换成清一色带撇号/引号/尖括号的内容，逼六种主测验模式
// （phrase/listen/reverse/num/gender/conj）+ 独立数字页测验全部抽到这类词当选项，
// 断言零 pageerror、且点击后判分依然正确。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8739;
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
if (!browserEnv) { skipNoBrowser('测验选项转义体检'); srv.close(); process.exit(0); }
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

// ── ① 词汇类三种模式（phrase/listen/reverse）：换掉 getAllPhrases，逼选项全带毒字符 ──
const POISON = [
  { de: "Mach's gut!", zh: '保重！', id: 'p-0' },
  { de: "Wie geht's?", zh: '咋样？', id: 'p-1' },
  { de: 'a"b', zh: '带双引号"的', id: 'p-2' },
  { de: 'a<b>c', zh: '带尖括号<>的', id: 'p-3' },
  { de: "O'Brien&Co", zh: '撇号加&的', id: 'p-4' },
];
for (const mode of ['phrase', 'listen', 'reverse']) {
  const r = await page.evaluate(([mode, poison]) => {
    const real = window.getAllPhrases;
    window.getAllPhrases = () => poison;
    const before = 0;
    let clashN = 0, scoreOk = true, errBefore = (window.__ebCount || 0);
    for (let i = 0; i < 20; i++) {
      mq = { score: 0, total: 0, mode, current: null, roundLen: 100 };
      nextQ();
      const box = document.getElementById('mainQuizArea');
      const opts = [...box.querySelectorAll('.quiz-opt')];
      const correctBtn = box.querySelector('.quiz-opt[data-correct="1"]');
      if (!correctBtn || opts.length !== 4) { clashN++; continue; }
      correctBtn.click();
      if (mq.score !== 1) scoreOk = false;
    }
    window.getAllPhrases = real;
    return { clashN, scoreOk };
  }, [mode, POISON]);
  if (r.clashN) bad(`${mode} 模式：20 次出题里 ${r.clashN} 次没能正常出题（选项数不对/找不到 data-correct）`);
  if (!r.scoreOk) bad(`${mode} 模式：点对了正确选项，分数却没涨`);
}

// ── ② 数字/冠词/动词变位三种模式：走真实内容，只验证结构 + 判分没被这次重构改坏 ──
for (const [mode, fn] of [['num', 'nextNumMainQ'], ['gender', 'nextGenderQ'], ['conj', 'nextConjQ']]) {
  const r = await page.evaluate(([mode, fn]) => {
    mq = { score: 0, total: 0, mode, current: null, roundLen: 10 };
    window[fn]();
    const box = document.getElementById('mainQuizArea');
    const correctBtn = box.querySelector('.quiz-opt[data-correct="1"]');
    if (!correctBtn) return { none: 1 };
    correctBtn.click();
    return { score: mq.score, cls: correctBtn.className };
  }, [mode, fn]);
  if (r.none) bad(`${mode} 测验：题目里没有 data-correct 标记的按钮`);
  else if (r.score !== 1 || !/\bcorrect\b/.test(r.cls)) bad(`${mode} 测验：点对了正确选项，判分不对（${JSON.stringify(r)}）`);
}

// ── ③ 结算页的错题列表：撇号词答错后，🔊 重播按钮要点得动 ──
const r3 = await page.evaluate((poison) => {
  window.__spoke = null;
  const real = window.speakDE;
  window.speakDE = (t) => { window.__spoke = t; };
  mq = { score: 0, total: 9, mode: 'phrase', current: poison[0], roundLen: 10, wrong: poison.slice(0, 3) };
  showQuizResult();
  const btns = [...document.querySelectorAll('#mainQuizArea .rank-row .speak-btn[data-w]')];
  const results = btns.map((b) => { window.__spoke = null; b.click(); return { attr: b.getAttribute('data-w'), spoke: window.__spoke }; });
  window.speakDE = real;
  return { n: btns.length, results };
}, POISON);
if (r3.n !== 3) bad(`结算页错题列表：应有 3 条带 🔊 的错题行，实际 ${r3.n}`);
for (const [i, x] of r3.results.entries()) {
  if (x.spoke !== POISON[i].de) bad(`结算页第 ${i + 1} 条错题：点🔊播的是「${x.spoke}」，应为「${POISON[i].de}」`);
}

// ── ④ 独立数字页测验（#numQuizArea，另一套 DOM，另一个 checkNumQ）──
await page.evaluate(() => showSection('numbers'));
await page.waitForTimeout(200);
const r4 = await page.evaluate(() => {
  if (typeof nextNumQ !== 'function') return { skip: 1 };
  const out = [];
  for (const mode of ['de2zh', 'zh2de', 'calc']) {
    numQ = { score: 0, total: 0, mode, current: null };
    nextNumQ();
    const box = document.getElementById('numQuizArea');
    const correctBtn = box.querySelector('.quiz-opt[data-correct="1"]');
    if (!correctBtn) { out.push({ mode, none: 1 }); continue; }
    correctBtn.click();
    out.push({ mode, score: numQ.score });
  }
  return { out };
});
if (r4.skip) bad('独立数字页测验：nextNumQ 不存在，检查是不是被重命名了');
else for (const x of r4.out) {
  if (x.none) bad(`独立数字页测验 ${x.mode}：没有 data-correct 标记的按钮`);
  else if (x.score !== 1) bad(`独立数字页测验 ${x.mode}：点对了正确选项，分数没涨`);
}

for (const e of errs) bad('页面抛错：' + e);

await browser.close();
srv.close();
console.log('测验选项转义体检：6 种主测验模式 + 独立数字页测验，词库全换成带撇号/引号/尖括号的内容');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 选项内容不管带什么符号都不会把测验炸掉，判分照常正确');
