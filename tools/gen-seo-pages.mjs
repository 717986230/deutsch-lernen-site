// 生成可被搜索引擎收录的独立教学页（npm run gen:seo）。
//
// 为什么需要它：主站是 hash 路由的单页应用 + 硬登录门槛。实测用 Googlebot 的 UA、
// 执行 JS、无登录态打开 www.uuoo.site，**渲染后只能看到 65 个字**——「登录 注册
// 用户名 密码…」。因为 :root.locked .section:not(#account){display:none!important}，
// 爬虫没有 localStorage token，所有内容版块都被 CSS 藏起来。也就是说 Google 收录到的
// 是一张登录表单，站里两万多字的教学内容一个字都没进索引。
//
// 这里生成的是**真实的、任何人都能打开的静态页**：爬虫和人看到的完全一样。
// 这一点必须守住——给爬虫看一套、给用户看另一套（cloaking）是 Google 明令禁止的
// 作弊手法，会被降权甚至除名。这些页只是「在主站导航里不显眼」，不是「对人隐藏」。
//
// 只收录**不含词库**的手写教学内容（发音/语法/数字）。词库、短文、测验仍然留在
// 加密的 .dat 里、仍然需要登录——AGENTS.md 1.3 的内容红线一个字都没动。
//
// 用预渲染而不是手工拼 HTML：字母表（LETTERS）、数字表（nums0/numsBig）都是 JS
// 生成的，手工复刻一份渲染逻辑就等于埋一个必然过期的副本。直接拿浏览器渲染完的结果，
// 永远和应用一致。代价是这一步需要 Chromium，所以**不挂在 npm run build 里**
// （build 要保持轻快），和既有的 gen:web 一样按需显式执行。
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8749;
const SITE = 'https://www.uuoo.site';

// 每页：输出文件 / 语言 / 要抓的版块 / title / description
// 合并薄内容：英语发音和英语数字各自只有几百字，单独成页属于 thin content，反而扣分。
const PAGES = [
  { file: 'de-pronunciation.html', lang: 'de', secs: ['pronunciation'],
    title: '德语发音规律完全指南：字母表 + 自然拼读 + 中文谐音 | 德语学习手册',
    desc: '德语 26 个字母怎么读、变音 ä ö ü 和组合音 ei/ie/ch/sch 的规律、德国小学生的自然拼读（切音节读长词），每条都配中文谐音。中国人自学德语发音，看这一页就够。' },
  { file: 'de-grammar.html', lang: 'de', secs: ['grammar'],
    title: '德语语法速查：der/die/das、四个格、动词变位、时态 | 德语学习手册',
    desc: '德语名词性别 der/die/das 怎么记、四个格（主格宾格与格属格）、动词变位、完成时与从句语序、形容词词尾、介词支配格，全部配例句拆解。' },
  { file: 'de-numbers.html', lang: 'de', secs: ['numbers'],
    title: '德语数字 0-100 万怎么读：倒序读法详解 + 中文谐音 | 德语学习手册',
    desc: '德语数字从 0 到百万的完整读法，重点讲清 21-99 的倒序规则（个位 + und + 十位），以及序数词「第几」怎么说。每个数字都配中文谐音。' },
  { file: 'en-grammar.html', lang: 'en', secs: ['en-grammar'],
    title: '英语语法速查：时态总表、五种句型、从句 | 英语学习手册',
    desc: '英语 16 大时态总表、五种基本句型、三大从句、情态动词、被动语态、非谓语动词，配例句逐条拆解。面向中文母语者的英语语法速查表。' },
  { file: 'en-pronunciation.html', lang: 'en', secs: ['en-pron', 'en-num'],
    title: '英语字母与数字读法 + 中文谐音 | 英语学习手册',
    desc: '英语 26 个字母的读法、5 个元音的长短音规律、常见字母组合，以及 1 到大数的英语读法与序数词，每条配中文谐音。' },
];

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
if (!env) { skipNoBrowser('SEO 教学页生成'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = env;

const built = readFileSync(join(ROOT, 'index.html'), 'utf8');
// 复用主站样式：直接把构建好的 <style> 原样搬过来，不另建一套样式表
const css = [...built.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
if (css.length < 1000) { console.error('ERROR 没能从 index.html 里取到样式，先跑 npm run build'); process.exit(1); }
// 源内容指纹：verify-seo-pages 用它判断生成物有没有过期
const srcHash = createHash('sha1').update(readFileSync(join(ROOT, 'src.html'))).digest('hex').slice(0, 12);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const browser = await chromium.launch(launchOpts);
const errs = [];
let wrote = 0;

for (const page of PAGES) {
  const tab = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  tab.on('pageerror', (e) => errs.push(`${page.file}: ${String(e).split('\n')[0]}`));
  await tab.addInitScript(([l]) => {
    try { localStorage.setItem('acct_token', 't1'); localStorage.setItem('siteLang', l); } catch (e) {}
  }, [page.lang]);
  await tab.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await tab.waitForFunction(() => window._DEC || window._ENC, null, { timeout: 25000 }).catch(() => {});

  const parts = [];
  for (const sec of page.secs) {
    const html = await tab.evaluate(async (sec) => {
      showSection(sec);
      await new Promise((r) => setTimeout(r, 700));      // 等 JS 把字母表/数字表填进去
      const src = document.getElementById(sec);
      if (!src) return null;
      const el = src.cloneNode(true);

      // 去掉一切需要主站 JS 才能工作的东西：留在静态页上就是点了没反应的死控件。
      // 按钮一律整个删——静态页没有任何一颗按钮能工作，而且 .speak-btn 这类是
      // addEventListener 绑的、压根没有 onclick 属性，只按属性筛会漏掉一大片 🔊。
      el.querySelectorAll('script,.subnav,.fab-read,#numQuizArea,#conjOut').forEach((x) => x.remove());
      el.querySelectorAll('button,input,select,textarea').forEach((x) => x.remove());
      el.querySelectorAll('[onclick],[oninput],[onchange],[onkeydown]').forEach((x) => {
        for (const a of ['onclick', 'oninput', 'onchange', 'onkeydown']) x.removeAttribute(a);
      });
      // 控件删了，正文里"点喇叭…"这类使用说明也得跟着删，否则在静态页上指着一个
      // 不存在的按钮。只切到分句为止，后半句往往仍然成立（例：
      // 「点喇叭只朗读该字母的英语名称；字母在单词中的实际读音请看下面的规则。」
      //  → 「字母在单词中的实际读音请看下面的规则。」）。
      // 按文本节点改，不碰标签。verify-seo-pages 会断言可见文字里不再有这类说明，
      // 将来新增的说法漏了会被抓到，而不是悄悄留在公开页上。
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const dead = /(点喇叭|点击喇叭|点按钮|点这里重试)[^；。]*[；。]\s*/g;
      let tn;
      while ((tn = walk.nextNode())) {
        if (dead.test(tn.nodeValue)) { dead.lastIndex = 0; tn.nodeValue = tn.nodeValue.replace(dead, ''); }
        dead.lastIndex = 0;
      }
      // 折叠块在静态页上一律展开：读者点不动，收着等于把内容藏了
      el.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
      el.removeAttribute('style');
      el.className = 'section active';
      return el.outerHTML;
    }, sec);
    if (html === null) { errs.push(`${page.file}: 找不到版块 #${sec}`); continue; }
    parts.push(html);
  }
  await tab.close();
  if (!parts.length) continue;

  const body = parts.join('\n');
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 500) { errs.push(`${page.file}: 抓到的正文只有 ${text.length} 字，疑似没渲染`); continue; }

  const others = PAGES.filter((p) => p.file !== page.file)
    .map((p) => `<a href="${p.file}">${esc(p.title.split(/[：|]/)[0])}</a>`).join(' · ');

  const out = `<!DOCTYPE html>
<html lang="zh-CN"${page.lang === 'en' ? '' : ''}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.desc)}">
<link rel="canonical" href="${SITE}/${page.file}">
<meta name="theme-color" content="#58cc02">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${SITE}/${page.file}">
<meta property="og:image" content="${SITE}/og-cover.png">
<meta property="og:locale" content="zh_CN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.desc)}">
<meta name="twitter:image" content="${SITE}/og-cover.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LearningResource","name":${JSON.stringify(page.title)},"url":"${SITE}/${page.file}","description":${JSON.stringify(page.desc)},"inLanguage":"zh-CN","teaches":${JSON.stringify(page.lang === 'en' ? '英语' : '德语')},"isAccessibleForFree":true,"isFamilyFriendly":true}</script>
<!-- 由 tools/gen-seo-pages.mjs 生成，勿手改；内容源自 src.html，改完请重跑 npm run gen:seo -->
<!-- src-hash:${srcHash} -->
<style>${css}</style>
</head>
<body${page.lang === 'en' ? ' class="lang-en"' : ''}>
<div class="container" style="padding-top:14px">
  <a href="/" style="font-size:13px;color:var(--gold-text);font-weight:600;text-decoration:none">← ${page.lang === 'en' ? '英语' : '德语'}学习手册 · 回首页</a>
</div>
${body}
<div class="container" style="padding:22px 0 40px">
  <div class="tip-card">
    <div class="tip-title">这页只是手册的一部分</div>
    <div class="tip-body">完整版还有 <b>4200+ 词句（每句带中文谐音）</b>、点词即听的真人朗读、分级短文与留学连载、拼写记忆和互动测验——<b>完全免费、无广告、可离线使用</b>。<br><a href="/" style="color:var(--gold-text);font-weight:700">→ 打开德语学习手册</a></div>
  </div>
  <p style="font-size:12px;color:var(--text-faint);margin-top:14px;line-height:2">其他速查页：${others}</p>
</div>
</body>
</html>`;
  writeFileSync(join(ROOT, page.file), out);
  wrote++;
  console.log(`  ${page.file.padEnd(26)} 正文 ${String(text.length).padStart(6)} 字   ${(out.length / 1024 | 0)}KB`);
}

await browser.close();
srv.close();

for (const e of errs) console.error('ERROR ' + e);
console.log(`SEO 教学页生成：${wrote}/${PAGES.length} 页（源指纹 ${srcHash}）`);
if (errs.length) process.exit(1);
