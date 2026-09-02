// 图卡测验「✏️ 看图选德语」的出题质量体检。
//
// 起因：用户反馈「看图选单词有不对的」。判分逻辑其实没问题（实测 200 题全对），
// 真正的毛病在出题：图卡里 💪 同时是肩膀/上臂/手肘/手臂，🦵 同时是大腿/膝盖/
// 小腿/小腿肚，🦶 同时是脚踝/脚/脚趾。一旦四个选项里有两个顶着同一张图，
// 这道「看图选」就真的没法看图作答 —— 实测 200 题里有 17 题（8.5%）如此。
//
// 光看代码看不出来（选项是随机抽的），所以在真浏览器里连抽几百题，
// 对每道题断言：四个选项互不相同、正确答案的图在四项中唯一、点对判对、点错判错。
//
// 2026-09 补上词汇测验（📝 版块的中→德 / 德→中 / 听音选义）。同样的病：
// 词库里 13 个词条德语相同而中文不同（das Gericht＝菜肴／法院），
// 174 个中文相同而德语不同（Tschüss!／Tschau!／Auf Wiedersehen! 都是「再见！」）。
// 旧的抽干扰项只查 id，实测 30 万道题里 62 道出现「两个选项都对、只有一个判分」，
// 约每 4839 题一次。这里按各级别各抽 5 万道复算，必须为 0。
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
// ── 词汇测验：干扰项不能和正解「显示成同一串」──
// 不靠概率撞（旧逻辑约每 4839 题才出一次，随机跑几万题也只有个位数命中，
// 而且拿脚本自己复刻一遍抽签逻辑等于测自己）。这里直接排队喂 Math.random，
// 把撞车的那一条硬塞给真正的 nextQ() 当干扰项，看它认不认。
// 实测：旧逻辑 60 组里 59 组沦陷（「非常感谢。」同时给出 Danke sehr. 和 Danke schön.，
// 两个都对却只有一个判分），改后 0 组。
// 德语和英语共用同一个 nextQ（setLang 只是原地换掉 categories 的内容），
// 但两套词库的撞车对数不一样：德语 204 对，英语 140 对。守卫必须在两边都成立，
// 所以两种语言各跑一遍 —— 只测德语的话，英语侧回归了没人知道。
const FORCED = 60;
const forceProbe = (n) => page.evaluate((n) => {
  quizLevel = 'all';
  const all = getAllPhrases();
  const pairs = [], byZh = new Map(), byDe = new Map();
  all.forEach((x, i) => {
    if (byZh.has(x.zh)) pairs.push({ kind: '同中文', a: byZh.get(x.zh), b: i }); else byZh.set(x.zh, i);
    if (byDe.has(x.de)) pairs.push({ kind: '同德语', a: byDe.get(x.de), b: i }); else byDe.set(x.de, i);
  });
  const out = { pairs: pairs.length, tried: 0, bad: [], fails: 0 };
  const real = Math.random;
  for (const pr of pairs.slice(0, n)) {
    // 先让它选中 a 出题，再连着 10 次把 b 递过去当干扰项
    const q = [pr.a / all.length];
    for (let i = 0; i < 10; i++) q.push(pr.b / all.length);
    let k = 0;
    Math.random = () => (k < q.length ? q[k++] : real());
    mq.mode = 'phrase'; mq.total = 0; mq.roundLen = 1e9; mq.score = 0;
    let threw = null;
    try { nextQ(); } catch (e) { threw = String(e); }
    Math.random = real;
    out.tried++;
    if (threw) { out.fails++; if (out.bad.length < 4) out.bad.push('nextQ 抛错：' + threw); continue; }
    const opts = [...document.querySelectorAll('#mainQuizArea .quiz-opt')].map((x) => x.textContent);
    const cur = all[pr.a];
    // 题干是中文、选项是德语：撞车＝不止一个选项对应同一个中文
    const alsoRight = opts.filter((o) => { const m = all.find((x) => x.de === o); return m && m.zh === cur.zh; }).length;
    if (opts.length !== 4 || new Set(opts).size < 4 || alsoRight > 1) {
      out.fails++;
      if (out.bad.length < 4) out.bad.push(`${pr.kind}「${cur.zh}」的选项：${opts.join(' / ')}（其中 ${alsoRight} 个都对）`);
    }
  }
  Math.random = real;
  return out;
}, n);

const vqs = {};
for (const lang of ['de', 'en']) {
  await page.evaluate((l) => setLang(l), lang);
  if (lang === 'en') {
    // 英语库是按需下载的 en.dat，没到货就跑等于测了个空池子
    await page.waitForFunction(() => window._ENC, null, { timeout: 30000 })
      .catch(() => bad('英语词库 30s 没到货，英语侧的出题检查没跑成'));
  }
  await page.waitForTimeout(300);
  const r = await forceProbe(FORCED);
  vqs[lang] = r;
  const L = lang === 'de' ? '德语' : '英语';
  if (!r.pairs) bad(`${L}词库里一对「同词条或同中文」都没有 —— 这个用例失去意义，检查 getAllPhrases`);
  if (r.fails) { bad(`${L}词汇测验：${r.tried} 组强制撞车里 ${r.fails} 组出现「两个选项都对」`); r.bad.forEach((x) => bad('  ' + x)); }
}
await page.evaluate(() => setLang('de'));
const vq = vqs.de;

for (const e of errs) bad(`页面抛错：${e}`);

await browser.close();
srv.close();
console.log(`测验出题体检：图卡 ${boards.length} 个板 × ${ROUNDS} 题（实出 ${asked} 道）`
  + ` · 词汇测验强制撞车 德语 ${vqs.de.tried}/${vqs.de.pairs} 组、英语 ${vqs.en.tried}/${vqs.en.pairs} 组`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 图卡题四选项唯一可辨、判分正确；词汇题没有「两个选项都对」');
