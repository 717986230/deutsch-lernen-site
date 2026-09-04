// 别人的资料渲染进页面时，不能变成可执行代码。
//
// 起因：排行榜/动态/关注列表的每一行以前是
//   onclick="openProfile('" + _esc(u.username) + "')"
// _esc 只转义 & < > "，**不转义 '**。而这里是「双引号 HTML 属性里的单引号 JS 字符串」：
// HTML 属性先被解码，解码后的文本才交给 JS 解析 —— 所以哪怕把 ' 转成 &#39; 也会还原成
// 真正的单引号，照样闭合字符串。实测把用户名设成 a');<注入>;// 再点一下那一行，
// 注入的代码真的执行了。
//
// 线上当时打不通：后端两条建号路径都把用户名夹在 [a-z0-9_]
// （注册 /^[a-z0-9_]{3,20}$/、OAuth 里 replace(/[^a-z0-9_]/g,'')）。
// 但前端不该指望后端的白名单 —— 那条正则哪天放宽（比如允许邮箱风格的用户名），
// 这里立刻变成存储型 XSS：一个人改个名，所有看排行榜的人中招。
// 现在用户名走 data- 属性 + addEventListener，根本不进 JS 字符串。
//
// 这个用例同时钉两头：① 恶意资料不执行；② 点行仍然能打开对应的人的主页
// —— 否则「把 onclick 删了」也能让 ① 通过，但功能就没了。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8737;
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
if (!browserEnv) { skipNoBrowser('资料渲染注入体检'); srv.close(); process.exit(0); }
const { chromium, launch: launchOpts } = browserEnv;
const browser = await chromium.launch(launchOpts);

// 每个字段都塞一条会「留痕」的载荷：真跑起来就把 window.__pwned 加一
const EVIL = {
  username: "a');window.__pwned=(window.__pwned||0)+1;//",
  nickname: '<img src=x onerror="window.__pwned=(window.__pwned||0)+1">昵称载荷',
  sig: '"><script>window.__pwned=(window.__pwned||0)+1</script>签名载荷',
  av_bg: 'red;"onmouseover="window.__pwned=(window.__pwned||0)+1',
  avatar: '<svg onload="window.__pwned=(window.__pwned||0)+1">',
};

const STUB = ([evil, mode]) => {
  window.__pwned = 0;
  window.__opened = [];
  const mk = (n) => Object.assign({
    username: n, nickname: n.toUpperCase(), avatar: '🦊', av_bg: '#58cc02', sig: 'hi',
    known: 500, streak: 3, best_streak: 9, total: 100, quiz: 20, level: 'B1',
    badges: 'word100', provider: 'pw', created: Date.now(),
  }, mode === 'evil' ? evil : {});
  const real = window.fetch;
  window.fetch = function (url) {
    const s = String(url);
    const j = (x) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
    if (s.indexOf('/api/me') >= 0) return j({ user: mk('me_self'), profiles: [], rank: 1, followers: 2, following: 3 });
    if (s.indexOf('/api/leaderboard') >= 0) return j({ by: 'known', list: [mk('alpha'), mk('beta')], total: 2 });
    if (s.indexOf('/api/feed') >= 0) return j({ list: [Object.assign(mk('gamma'), { type: 'streak', data: '9', ts: Date.now() })] });
    if (s.indexOf('/api/following') >= 0) return j({ list: [mk('delta')] });
    if (s.indexOf('/api/profile?name=') >= 0) {
      const n = decodeURIComponent(s.split('name=')[1].split('&')[0]);
      window.__opened.push(n);
      return j({ user: mk(n), rank: 5, followers: 1, following: 1, isFollowing: false, isMe: false });
    }
    if (s.indexOf('/api/progress') >= 0) return j({ rev: 1, document: {} });
    if (s.indexOf('/api/') >= 0) return j({ ok: 1, list: [], badges: [] });
    return real.apply(this, arguments);
  };
};

async function open(mode) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  page.on('dialog', async (d) => { errs.push('弹出 dialog：' + d.message()); await d.dismiss(); });
  await page.addInitScript(STUB, [EVIL, mode]);
  await page.addInitScript(() => { try { localStorage.setItem('acct_token', 't1'); } catch (e) {} });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window._DEC, null, { timeout: 20000 }).catch(() => {});
  return { page, errs };
}

const VIEWS = [
  ['排行榜', () => { showSection('rank'); renderRank('known'); }, '#rankList .rank-row', 'alpha'],
  ['动态流', () => { showSection('rank'); renderFeed(); }, '#rankList .rank-row', 'gamma'],
  ['关注列表', () => { showFollowing(); }, '#meView .rank-row', 'delta'],
];

// ── ① 恶意资料：渲染 + 点击都不许执行 ──
{
  const { page, errs } = await open('evil');
  for (const [name, setup, sel] of VIEWS) {
    await page.evaluate(setup);
    await page.waitForTimeout(700);
    const r = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
      return { had: !!el, pwned: window.__pwned || 0 };
    }, sel);
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.__pwned || 0);
    if (!r.had) bad(`${name}：一行都没渲染出来，这个用例等于没测`);
    if (after) bad(`${name}：恶意资料被当成代码执行了（__pwned=${after}）—— 存储型 XSS`);
  }
  // 恶意昵称/签名必须以「文字」形式出现，而不是被解析成标签
  const literal = await page.evaluate(() => document.body.innerText.indexOf('昵称载荷') >= 0 || document.body.innerText.indexOf('签名载荷') >= 0);
  if (!literal) bad('恶意昵称/签名连文字都没显示出来 —— 可能被整段吞了，检查渲染');
  for (const e of errs) bad('恶意资料下抛错：' + e);
  await page.close();
}

// ── ② 正常资料：点行必须真的打开对应的人 ──
{
  const { page, errs } = await open('clean');
  for (const [name, setup, sel, expect] of VIEWS) {
    await page.evaluate(setup);
    await page.waitForTimeout(700);
    const had = await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); return !!el; }, sel);
    await page.waitForTimeout(600);
    const opened = await page.evaluate(() => { const o = window.__opened.slice(); window.__opened.length = 0; return o; });
    if (!had) bad(`${name}：一行都没渲染出来`);
    else if (!opened.includes(expect)) bad(`${name}：点了行却没打开「${expect}」的主页（实际 ${JSON.stringify(opened)}）—— 绑定丢了`);
  }
  // 资料卡上的关注按钮要带上对方用户名
  await page.evaluate(() => { showSection('rank'); renderRank('known'); });
  await page.waitForTimeout(700);
  await page.evaluate(() => { const el = document.querySelector('#rankList .rank-row'); if (el) el.click(); });
  await page.waitForTimeout(800);
  const fb = await page.evaluate(() => {
    const btn = document.querySelector('.follow-btn[data-u]');
    return btn ? { u: btn.getAttribute('data-u') } : { none: 1 };
  });
  if (fb.none) bad('别人的资料卡上没有关注按钮');
  else if (fb.u !== 'alpha') bad(`关注按钮绑的是「${fb.u}」，应为「alpha」`);
  for (const e of errs) bad('正常资料下抛错：' + e);
  await page.close();
}

// ── ③ 源码层面：用户名不许再出现在行内 onclick 的 JS 字符串里 ──
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
for (const m of src.matchAll(/onclick="[^"]*\\'\s*\+\s*_esc\(([^)]*)\)/g)) {
  bad(`src.html 又把 ${m[1].trim()} 拼进了行内 onclick 的单引号字符串里 —— 请改用 data- 属性 + addEventListener`);
}

await browser.close();
srv.close();
console.log(`资料渲染注入体检：${VIEWS.length} 个列表 × 恶意/正常两轮 · ${Object.keys(EVIL).length} 个字段载荷`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 别人的资料不会变成代码，点行仍能正常打开主页');
