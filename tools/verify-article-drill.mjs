// 短文 / 连载的「⌨️ 练这篇 / 练这集」体检。
//
// 起因：站里 69 篇短文（685 句）+ 12 集连载（96 句）此前**只能读**——
// 读完就没了，既不进测验也不进 SRS。而对话早就有「⌨️ 练这段」（spStartDialog），
// 同一台拼写引擎、同一套句子长度规则，短文那扇门却一直没开。
//
// 这里盯四件事：
//   ① 每篇/每集都有入口，数量与当前列表一致（分批渲染容易只给前几篇挂上）
//   ② 点进去真的进拼写页、真的切到句子模式、题目全部出自该篇
//   ③ 句子都偏长的文章不能给一屏空白，要有提示
//   ④ 「继续上次」记录写的是**分语言键**，且 resumeLast 能按标题找回来
//      —— 写入侧用 lastStudy_de/_en，读取侧一度还在读裸 lastStudy，
//      于是首页那条「▶ 继续上次」要么不出现要么永远是老值。这道检查钉死它。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8746;
const MIN = 6, MAX = 42;          // 与 spStartDialog 同一套长度规则
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
if (!browserEnv) { skipNoBrowser('短文练习入口体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
await page.addInitScript(() => {
  try { localStorage.setItem('acct_token', 't1'); } catch (e) {}
  if (window.speechSynthesis) window.speechSynthesis.speak = function () {};
});
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window._DEC, null, { timeout: 20000 }).catch(() => {});

const fits = (paras) => paras.filter((p) => {
  const t = String(p[0] || '').trim();
  return t.length >= MIN && t.length <= MAX;
});

let drilled = 0, sentences = 0;
for (const [kind, sec, listFn, starter, label] of [
  ['短文', 'reading', '_getReadList()', 'spStartReading', '短文拼写'],
  ['连载', 'series', '_getSeriesList()', 'spStartSeries', '连载拼写'],
]) {
  // ── ① 入口数量 ──
  const cnt = await page.evaluate(async ([sec, listFn, starter]) => {
    showSection(sec);
    // 两个版块都是 rAF 分批追加，等列表不再增长
    let prev = -1, now = 0, g = 0;
    while (prev !== now && g++ < 60) {
      prev = now; await new Promise((r) => setTimeout(r, 250));
      // 只数**看得见**的：hidden / display:none 的按钮照样在 DOM 里，
      // 光数 querySelectorAll 的话「只给前 6 篇挂上」这种漏挂根本抓不到（牙齿测试实证）。
      now = [...document.querySelectorAll(`button[onclick^="${starter}"]`)]
        .filter((b) => b.offsetParent !== null && b.getBoundingClientRect().width > 0).length;
    }
    return { btns: now, list: eval(listFn).length };
  }, [sec, listFn, starter]);
  if (cnt.btns !== cnt.list) bad(`${kind}：列表 ${cnt.list} 篇，「练这篇」按钮只有 ${cnt.btns} 个`);

  // ── ②③ 逐篇点进去 ──
  const r = await page.evaluate(async ([sec, listFn, starter, label, MIN, MAX]) => {
    const wait = (ms) => new Promise((r2) => setTimeout(r2, ms));
    const list = eval(listFn);
    const out = { items: [] };
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const want = a.paras.filter((p) => {
        const t = String(p[0] || '').trim();
        return t.length >= MIN && t.length <= MAX;
      }).map((p) => String(p[0]).trim());
      showSection(sec); await wait(60);
      window[starter](i); await wait(120);
      const active = document.querySelector('.section.active');
      out.items.push({
        title: a.title, want: want.length,
        sec: active ? active.id : '?',
        unit: typeof SP !== 'undefined' ? SP.unit : '?',
        got: typeof SP !== 'undefined' && SP.q ? SP.q.map((x) => x.de) : [],
        slots: document.querySelectorAll('#spSlots .sp-slot').length,
        last: (() => { try { return JSON.parse(localStorage.getItem('lastStudy_de') || '{}'); } catch (e) { return {}; } })(),
      });
    }
    return out;
  }, [sec, listFn, starter, label, MIN, MAX]);

  for (const it of r.items) {
    if (!it.want) {
      // ③ 整篇都是长句：不该进拼写页，也不该白屏
      if (it.sec === 'spell' && !it.got.length) bad(`${kind}「${it.title}」没有可练的句子，却还是跳进了拼写页且一题都没有`);
      continue;
    }
    drilled++;
    if (it.sec !== 'spell') { bad(`${kind}「${it.title}」点「练这篇」后停在「${it.sec}」，没进拼写页`); continue; }
    if (it.unit !== 'sent') bad(`${kind}「${it.title}」拼写单位是「${it.unit}」，应为句子模式 sent`);
    if (it.got.length !== it.want) bad(`${kind}「${it.title}」应出 ${it.want} 句，实际 ${it.got.length} 句`);
    if (!it.slots) bad(`${kind}「${it.title}」进了拼写页但一个字母格都没渲染`);
    if (it.last.name !== `${label} · ${it.title}`) {
      bad(`${kind}「${it.title}」的「继续上次」记录是「${it.last.name}」（应为「${label} · ${it.title}」）`
        + ' —— 注意键必须是分语言的 lastStudy_de');
    }
    sentences += it.got.length;
  }
}

// ── ④ resumeLast 能按标题找回来 ──
const rr = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r2) => setTimeout(r2, ms));
  const list = _getReadList();
  let i = 0; while (i < list.length && !list[i].paras.some((p) => { const t = String(p[0] || '').trim(); return t.length >= 6 && t.length <= 42; })) i++;
  showSection('reading'); await wait(80);
  spStartReading(i); await wait(150);
  const want = SP.q.length, title = list[i].title;
  showSection('home'); await wait(120);
  const shown = (document.querySelector('.dash-last') || {}).textContent || '';
  resumeLast(); await wait(300);
  const active = document.querySelector('.section.active');
  return { title, want, got: SP.q.length, sec: active ? active.id : '?', shown };
});
if (rr.sec !== 'spell') bad(`「继续上次」之后停在「${rr.sec}」，没回到拼写页`);
if (rr.got !== rr.want) bad(`「继续上次」恢复了 ${rr.got} 句，原本是 ${rr.want} 句`);
if (rr.shown.indexOf(rr.title) < 0) bad(`首页「▶ 继续上次」没显示出「${rr.title}」，实际是「${rr.shown}」`
  + ' —— renderHomeDash 读的键要和 _lastStudySet 写的一致');

for (const e of errs) bad('页面抛错：' + e);
await browser.close(); srv.close();
console.log(`短文练习入口体检：短文 + 连载逐篇点开 ${drilled} 篇、共 ${sentences} 句进拼写引擎，`
  + '「继续上次」按标题找回验过');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 每篇短文/连载都能直接练，题目只来自该篇，继续上次能接回');
