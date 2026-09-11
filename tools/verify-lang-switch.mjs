// 切到英语后，页面上不该再有地方说「德语」。
//
// 起因：站长在真机上截到测验页的「听力测验」卡片——英语模式下副标题还写着
// 「听德语→选中文」。根因是那张卡的副标题**没有 id**，而 updateQuizCardLang()
// 只按 id 更新了旁边三张（qdNum/qdPhrase/qdReverse），它就成了漏网之鱼。
// 同一次排查还挖出三处同类问题：
//   · 阅读/连载顶部写着「点德语词查词义」——英语模式下 renderReadings/renderSeries
//     走的是 p[0] 原文、根本不过 wrapWords，一个可点词都没有（实测 .w span = 0），
//     等于既说错语言、又在推销一个点不动的功能，连那颗「隐藏词义」按钮都是死的。
//   · 连载页底部「正版视频资源」全是 DW 慢速德语新闻之类的**德语**学习资源。
//
// 这类 bug 之前一直漏，是因为回归检查基本都只跑德语（LANG 默认 de）。
// 这份检查专门站在英语那一侧看，是上面那批修复的防回退网。
//
// 只查「英语模式里冒出德语」这一个方向：反过来（德语模式里出现「英语」）有大量正当
// 情形——发音页讲英德同源词、外来词页比对英语说法等等，做成检查只会满屏误报。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8742;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

// 英语模式下能打开的版块（de-only 的发音/数字/语法/图解不在此列）
const SECS = 'home phrases reading series dialog quiz spell rank support me en-pron en-num en-grammar'.split(' ');

// 白名单：确实应该提到德语的地方。写成「版块 + 必须包含的片段」，别放太宽。
const ALLOW = [
  // 英语发音页拿德语作对比，说明英语不规则 —— 这是刻意的修辞，不是漏翻
  { sec: 'en-pron', has: '不像德语' },
];
const allowed = (sec, txt) => ALLOW.some((a) => a.sec === sec && txt.includes(a.has));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.dat': 'application/octet-stream', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const env = await getChromium();
if (!env) { skipNoBrowser('英语端语言切换体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = env;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.addInitScript(() => {
  try { localStorage.setItem('acct_token', 't1'); localStorage.setItem('siteLang', 'en'); } catch (e) {}
});
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._ENC, null, { timeout: 25000 })
  .catch(() => bad('英语词库一直没就绪（en.dat 没到货）'));
await page.waitForTimeout(400);

// ── ① 逐版块扫可见文字里的「德语 / 德文」──
let scanned = 0;
for (const sec of SECS) {
  const r = await page.evaluate((sec) => {
    const el = document.getElementById(sec);
    if (!el) return { missing: 1 };
    showSection(sec);
    return { ok: 1 };
  }, sec);
  if (r.missing) { bad(`找不到版块 #${sec}`); continue; }
  await page.waitForTimeout(260);   // 阅读/连载是 rAF 分批渲染的，等它铺开
  const hits = await page.evaluate((sec) => {
    const el = document.getElementById(sec);
    const out = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const t = (n.nodeValue || '').trim();
      if (!t || !/德语|德文/.test(t)) continue;
      if (!n.parentElement || !n.parentElement.offsetParent) continue;  // 只算真看得见的
      out.push(t.slice(0, 80));
    }
    el.querySelectorAll('input[placeholder]').forEach((i) => {
      if (/德语|德文/.test(i.placeholder) && i.offsetParent) out.push('[输入框提示] ' + i.placeholder.slice(0, 70));
    });
    return out;
  }, sec);
  scanned++;
  for (const t of [...new Set(hits)]) {
    if (allowed(sec, t)) continue;
    bad(`英语模式下 ${sec} 版块仍显示德语相关文案：「${t}」`);
  }
}

// ── ② 测验卡片副标题必须整体倒向英语（听力那张就是这么漏的）──
await page.evaluate(() => showSection('quiz'));
await page.waitForTimeout(200);
const cards = await page.evaluate(() => [...document.querySelectorAll('#quiz .card')]
  .filter((c) => c.offsetParent)
  .map((c) => c.innerText.replace(/\s+/g, ' ').trim()));
if (cards.length < 5) bad(`英语模式下测验卡片只剩 ${cards.length} 张，疑似被 de-only-block 误藏`);
for (const c of cards) {
  if (/德语/.test(c)) bad(`英语模式下测验卡片仍写着德语：「${c}」`);
}
// 三张会点名语种的卡，必须说「英语」
for (const kw of ['看数字→选英语', '看中文→选英语', '看英语→选中文', '听英语→选中文']) {
  if (!cards.some((c) => c.includes(kw))) bad(`英语模式下测验卡片缺少「${kw}」这张（副标题没跟着切语言？）`);
}

// ── ③ 德语专属功能不该在英语端露头 ──
const feat = await page.evaluate(async () => {
  const vis = (el) => !!(el && el.offsetParent);
  showSection('reading');
  await new Promise((r) => setTimeout(r, 500));
  const rdGloss = [...document.querySelectorAll('#reading .gloss-btn')].some(vis);
  const rdWords = document.querySelectorAll('#readList .w').length;
  showSection('series');
  await new Promise((r) => setTimeout(r, 700));
  const srGloss = [...document.querySelectorAll('#series .gloss-btn')].some(vis);
  const srWords = document.querySelectorAll('#seriesList .w').length;
  const links = document.getElementById('seriesLinks');
  return { rdGloss, rdWords, srGloss, srWords, linksVisible: vis(links), linkN: links ? links.children.length : 0 };
});
// 英语没有逐词小注 → 那颗「隐藏词义」按钮点了也没反应，不能留在页面上
if (feat.rdWords === 0 && feat.rdGloss) bad('英语模式下阅读页没有可点词（.w = 0），却还留着「隐藏词义」按钮 —— 点了没反应');
if (feat.srWords === 0 && feat.srGloss) bad('英语模式下连载页没有可点词（.w = 0），却还留着「隐藏词义」按钮 —— 点了没反应');
if (feat.linksVisible) bad(`英语模式下连载页仍显示 ${feat.linkN} 个德语视频资源（DW 等）`);

// ── ④ 级别叫法必须整站一致地倒向英语考试体系 ──
// 站里有两套级别叫法：德语走 CEFR（零基础/A1/A2/B1/B2），英语走考试体系
// （入门/中考/高考/四级/六级，见 LN_EN / LEVEL_TABS_EN）。词句页和测验页早就切了，
// 但拼写页把 ['a1','⭐ A1'] 这串**写死**在 spRenderLevels 里，阅读页和连载页则直接引
// READ_LEVELS/READ_LN —— 于是英语端这三处的标签、以及每张短文/连载卡上的徽章，
// 全都还挂着 A1/A2/B1。中国人学英语没人按 CEFR 分级，这是实打实的错。
// 注：C1/C2 只有德语库有内容，英语侧没有对应叫法，真出现了会退回 CEFR 原名，这里放行。
const CEFR = /(^|[^A-Za-z])(A1|A2|B1|B2)([^A-Za-z]|$)|零基础/;
const lvSpots = [
  ['词句页级别标签', 'phrases', '#levelTabs .level-tab'],
  ['测验页出题范围', 'quiz', '#quizLevelTabs .level-tab'],
  ['拼写页级别', 'spell', '#spLevels button'],
  ['阅读页级别标签', 'reading', '#readLevelTabs .level-tab'],
  ['阅读卡片徽章', 'reading', '#readList .level-badge'],
  ['连载页级别标签', 'series', '#seriesLevelTabs .level-tab'],
  ['连载卡片徽章', 'series', '#seriesList .level-badge'],
];
let lvChecked = 0;
for (const [name, sec, sel] of lvSpots) {
  const txts = await page.evaluate(async ([sec, sel]) => {
    showSection(sec);
    await new Promise((r) => setTimeout(r, 700));   // 阅读/连载分批渲染，等首批铺开
    return [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => e.innerText.trim());
  }, [sec, sel]);
  if (!txts.length) { bad(`${name}：一个都没渲染出来（选择器 ${sel}）`); continue; }
  lvChecked += txts.length;
  const stale = [...new Set(txts.filter((t) => CEFR.test(t)))];
  if (stale.length) bad(`英语模式下「${name}」仍在用德语的 CEFR 叫法：${stale.join('、')} —— 英语该是 入门/中考/高考/四级/六级`);
}

// ── ⑤ 首页问候语 ──
const hi = await page.evaluate(async () => {
  showSection('home');
  await new Promise((r) => setTimeout(r, 300));
  const el = document.querySelector('.dash-hi');
  return el ? el.innerText.split('\n')[0].trim() : null;
});
if (hi === null) bad('首页找不到 .dash-hi 问候语');
else if (/Hallo/.test(hi)) bad(`英语模式下首页还在用德语问候：「${hi}」`);

for (const e of errs) bad('页面抛错：' + e);

await browser.close();
srv.close();
console.log(`英语端语言切换体检：扫了 ${scanned} 个版块的可见文案 + 测验卡片 ${cards.length} 张 + 德语专属功能 3 处 + 级别叫法 ${lvChecked} 处 + 首页问候`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 切到英语后没有残留的德语文案，也没有德语专属功能露头');
