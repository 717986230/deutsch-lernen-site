// 窄屏体检：横向溢出 + 无名按钮。
//
// 起因（2026-09 全面排查）：
//   ① 拼写页长词的字母格冲出屏幕 —— .sp-word 是 inline-flex 且不能词内换行；
//   ② 测验选项网格被长德语词撑破 —— grid-template-columns:1fr 1fr 里的 1fr 实际是
//      minmax(auto,1fr)，die Geschwindigkeitsbeschränkung（32 字符）会把列撑过半屏。
//      这条**随机触发**：取决于长词和哪些干扰项排在同一行，360px 屏实测页宽 376～383。
//   两个都是「打开版块看不出来、进入交互态遇到长词才炸」—— verify-sections 只查 pageerror、
//   只打开版块，结构性地抓不到。所以这里专门进交互态、专门喂长词。
//   ③ 语法页 26 个例句 🔊 只有 onclick、没有 aria-label —— 读屏只念「按钮」，
//      不知道要读哪句。拼写页改成纯图标按钮后这类问题更容易漏，一并钉住。
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { getChromium, skipNoBrowser } from './_browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8748;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

// ── ③ 静态：所有 speak-btn 必须有可读名称（aria-label 或 title）──
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
const unnamed = [...src.matchAll(/<button class="speak-btn"(?![^>]*aria-label)(?![^>]*title)[^>]*>/g)];
for (const m of unnamed.slice(0, 5)) {
  bad(`src.html:${src.slice(0, m.index).split('\n').length} 的 🔊 按钮没有 aria-label/title，读屏只会念「按钮」`);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.dat': 'application/octet-stream',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const srv = createServer((req, res) => {
  const p = join(ROOT, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[p.slice(p.lastIndexOf('.'))] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => srv.listen(PORT, r));
const env = await getChromium();
if (!env) { skipNoBrowser('窄屏体检'); srv.close(); process.exit(fail ? 1 : 0); }
const browser = await env.chromium.launch(env.launch);

const LONG_NICK = { username: 'averyveryverylongusername_2026', nickname: '一个名字特别特别特别长的德语学习者同学',
  avatar: '🦊', av_bg: '#eee', level: 'B2', known: 1234, streak: 365, total: 99999, badges: 12 };
let scenes = 0;
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await page.addInitScript(([th, nick]) => {
    localStorage.setItem('acct_token', 't1'); localStorage.setItem('theme', th);
    localStorage.setItem('spWrong_de', JSON.stringify({
      'die Geschwindigkeitsbeschränkung': { zh: '限速（一个特别长的中文释义用来检查换行）', py: '迪 格施温迪希凯茨贝施伦孔', n: 7, ts: 2 } }));
    window.confirm = () => true;
    if (window.speechSynthesis) window.speechSynthesis.speak = function () {};
    const real = window.fetch;
    window.fetch = function (u) {
      const s = String(u);
      const j = (x) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(x) });
      if (s.indexOf('/api/leaderboard') >= 0) return j({ by: 'known', total: 88, users: 226, list: Array.from({ length: 12 }, () => nick) });
      if (s.indexOf('/api/') >= 0 || s.indexOf('/collect') >= 0) return j({ user: nick, rank: 1, rev: 1, document: {}, list: [], total: 0, users: 0, badges: [], followers: 3, following: 5 });
      return real.apply(this, arguments);
    };
  }, [theme, LONG_NICK]);
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window._DEC, null, { timeout: 25000 }).catch(() => {});
  await page.addStyleTag({ content: '#boostModal{display:none!important}' });

  const SCENES = [
    ['拼写·词库最长单词', `showSection('spell');await w(250);quizLevel='all';
      var L=spBuildPool('all').sort(function(a,b){return b.de.length-a.de.length;})[0];
      SP.unit='word';SP.q=[L];SP.i=0;SP.review=false;SP.daily=false;
      document.getElementById('spSetup').style.display='none';document.getElementById('spDrill').style.display='';spLoad();`],
    ['拼写·长句', `SP.unit='sent';SP.q=[{de:'Ich möchte bitte einen Tisch für zwei Personen reservieren.',zh:'订桌',py:'x'}];SP.i=0;spLoad();`],
    // 强制长词进测验：德→中（题干是长词）+ 中→德（长词在选项里）各连抽 20 次，取最坏
    ['测验·长词连抽', `showSection('quiz');await w(250);quizLevel='all';
      var all=getAllPhrases();
      var L=all.filter(function(p){return !/\\s/.test(p.de.replace(/^(der|die|das)\\s+/,''));}).sort(function(a,b){return b.de.length-a.de.length;})[0];
      var idx=all.indexOf(L),real=Math.random,worst=0;
      for(var t=0;t<40;t++){var k=0;Math.random=function(){return k++===0?idx/all.length+1e-9:real();};
        startQuiz(t%2?'phrase':'reverse');Math.random=real;await w(20);
        worst=Math.max(worst,document.documentElement.scrollWidth);}
      window.__worst=worst;`],
    ['测验·错题库', `startQuiz('wrongbook');`],
    ['错题本展开', `renderWrongBook();var d=document.querySelector('#wrongBook details');if(d)d.open=true;`],
    ['图解·逐板+浮条', `showSection('body');await w(250);for(var i=0;i<PIC_BOARDS.length;i++){switchBoard(PIC_BOARDS[i].id);await w(60);}
      switchBoard('lob');await w(100);document.querySelectorAll('#boardGrid .pic-cell')[5].click();`],
    ['排行榜·长昵称', `showSection('rank');await w(500);`],
    ['我的', `showSection('me');await w(600);`],
    ['短文', `showSection('reading');await w(1200);`],
  ];
  for (const [name, code] of SCENES) {
    const r = await page.evaluate(async (code) => {
      const w = (ms) => new Promise((r2) => setTimeout(r2, ms));
      window.__worst = 0;
      try { await (eval('(async function(){' + code + '})'))(); } catch (e) { return { err: e.message }; }
      await w(350);
      return { sw: Math.max(document.documentElement.scrollWidth, window.__worst || 0), W: innerWidth };
    }, code);
    scenes++;
    if (r.err) bad(`[${theme}] ${name}：场景脚本抛错 ${r.err}`);
    else if (r.sw > r.W) bad(`[${theme}] ${name}：360px 屏横向溢出，页宽被撑到 ${r.sw}`);
  }
  for (const e of new Set(errs)) bad(`[${theme}] 页面抛错：${e}`);
  await page.close();
}
await browser.close(); srv.close();
console.log(`窄屏体检：360px × 深浅 · ${scenes} 个交互场景（含长词强制进测验 40 抽）· 静态检查 🔊 按钮可读名称`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 窄屏无横向溢出，朗读按钮都有可读名称');
