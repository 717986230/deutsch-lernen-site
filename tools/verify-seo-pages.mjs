// SEO 教学页体检（tools/gen-seo-pages.mjs 的产物）。
//
// 这几页是给搜索引擎看的**唯一**入口：主站是 hash 路由单页 + 硬登录门槛，
// 爬虫渲染后只看得到 65 个字的登录表单。所以这几页坏了 = SEO 归零，而且不会有人发现
// （站长自己是登录态，永远走不到这条路径上）。
//
// 五类检查：
//   ① 生成物没过期：页里嵌的 src-hash 必须等于当前 src.html 的指纹
//   ② 每页都有 title / description / canonical，且互不重复（重复=自己跟自己抢排名）
//   ③ 正文有实质内容，且**无需登录**即可见（这是这几页存在的全部意义）
//   ④ 没有死控件：按钮都删干净了，正文里也不再有"点喇叭…"这类指向已删控件的说明
//   ⑤ 没有泄漏明文词库（AGENTS.md 1.3 红线；这几页只该有手写教学内容）
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8743;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const FILES = ['de-pronunciation.html', 'de-grammar.html', 'de-numbers.html',
  'en-grammar.html', 'en-pronunciation.html'];

// ── ① 生成物是否过期 ──
const srcHash = createHash('sha1').update(readFileSync(join(ROOT, 'src.html'))).digest('hex').slice(0, 12);
for (const f of FILES) {
  if (!existsSync(join(ROOT, f))) { bad(`缺少 ${f} —— 跑一次 npm run gen:seo`); continue; }
  const m = readFileSync(join(ROOT, f), 'utf8').match(/<!-- src-hash:([0-9a-f]+) -->/);
  if (!m) bad(`${f} 里没有 src-hash 标记，可能不是 gen-seo-pages 生成的`);
  else if (m[1] !== srcHash) bad(`${f} 已过期（页内 ${m[1]}，当前 src.html ${srcHash}）—— 跑一次 npm run gen:seo`);
}
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }

// ── ⑤ 明文词库泄漏（不需要浏览器，先查）──
for (const f of FILES) {
  const s = readFileSync(join(ROOT, f), 'utf8');
  if (s.includes('"de":"Guten Morgen')) bad(`${f} 泄漏了明文词库`);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.dat': 'application/octet-stream', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));

const env = await getChromium();
if (!env) { skipNoBrowser('SEO 教学页体检'); srv.close(); process.exit(fail ? 1 : 0); }
const { chromium, launch: launchOpts } = env;
const browser = await chromium.launch(launchOpts);

const titles = new Map(), descs = new Map();
let totalWords = 0;

for (const f of FILES) {
  // 关键：用 Googlebot 的 UA、且**不塞任何 localStorage**——爬虫就是这个处境
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await page.goto(`http://localhost:${PORT}/${f}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const r = await page.evaluate(() => {
    const meta = (sel, attr) => { const e = document.querySelector(sel); return e ? e.getAttribute(attr) : null; };
    const txt = document.body.innerText.replace(/\s+/g, ' ').trim();
    return {
      title: document.title,
      desc: meta('meta[name="description"]', 'content'),
      canonical: meta('link[rel="canonical"]', 'href'),
      ld: !!document.querySelector('script[type="application/ld+json"]'),
      words: txt.length,
      locked: document.documentElement.classList.contains('locked'),
      buttons: document.querySelectorAll('button').length,
      deadHints: (txt.match(/点喇叭|点击喇叭|点按钮|点这里重试/g) || []).length,
      h2: [...document.querySelectorAll('h2')].filter((x) => x.offsetParent).length,
      inLinks: [...document.querySelectorAll('a[href]')].filter((a) => a.offsetParent).length,
    };
  });
  await page.close();
  totalWords += r.words;

  // ② 元信息齐全且不重复
  if (!r.title || r.title.length < 10) bad(`${f} 的 title 缺失或过短：「${r.title}」`);
  else if (titles.has(r.title)) bad(`${f} 和 ${titles.get(r.title)} 的 title 完全相同 —— 会自己跟自己抢排名`);
  else titles.set(r.title, f);
  if (!r.desc || r.desc.length < 40) bad(`${f} 的 meta description 缺失或过短`);
  else if (descs.has(r.desc)) bad(`${f} 和 ${descs.get(r.desc)} 的 description 完全相同`);
  else descs.set(r.desc, f);
  if (r.canonical !== `https://www.uuoo.site/${f}`) bad(`${f} 的 canonical 不对：${r.canonical}`);
  if (!r.ld) bad(`${f} 没有 JSON-LD 结构化数据`);

  // ③ 免登录可见 + 有实质内容
  if (r.locked) bad(`${f} 被登录墙挡住了（root 带 locked）—— 这几页的全部意义就是免登录可见`);
  if (r.words < 900) bad(`${f} 正文只有 ${r.words} 字，thin content 反而扣分`);
  if (!r.h2) bad(`${f} 没有可见的 h2 标题`);
  if (r.inLinks < 3) bad(`${f} 只有 ${r.inLinks} 个可见链接，互链太少不利于抓取`);

  // ④ 没有死控件
  if (r.buttons) bad(`${f} 还留着 ${r.buttons} 个按钮 —— 静态页上没有 JS，点了不会有任何反应`);
  if (r.deadHints) bad(`${f} 正文里还有 ${r.deadHints} 处"点喇叭"之类的说明，但控件已被删掉`);
  for (const e of errs) bad(`${f} 抛错：${e}`);
}

await browser.close();
srv.close();
console.log(`SEO 教学页体检：${FILES.length} 页 · 免登录可见正文合计 ${totalWords} 字 · 元信息/互链/死控件/词库泄漏各验一遍`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 教学页免登录可见、元信息齐全不重复、无死控件、未泄漏词库');
