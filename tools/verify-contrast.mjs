// 「同一条 CSS 规则里同时写了 background 和 color」的对比度体检。
//
// 为什么单挑这种规则：页面上的常态文字已经被逐个量过一轮，剩下的坑几乎都在
// **瞬时状态类**里 —— .playing / .speaking / .on / .ok 这些只在朗读中、答对时
// 出现半秒，截图和静态遍历都抓不到，却恰恰是最容易只改一半（换了底色忘了换字色）的地方。
// 这类规则自带前景+背景，可以脱离 DOM 直接算，正好补上那段盲区。
//
// 规则（WCAG 1.4.3）：<18px 的正文要 ≥4.5:1，≥18px（或 ≥14px 且 bold）算大字，≥3:1。
// 深浅两套令牌各算一遍 —— 品牌绿这类颜色在两个主题下差别极大。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

// ── 取出 :root 与 :root[data-theme="dark"] 两套令牌 ──
function tokens(sel) {
  const i = src.indexOf(sel + '{');
  if (i < 0) return {};
  const body = src.slice(i + sel.length + 1, src.indexOf('}', i));
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) out[m[1]] = m[2].trim();
  return out;
}
const LIGHT = tokens(':root');
const DARK = { ...LIGHT, ...tokens(':root[data-theme="dark"]') };

function parse(c, vars, depth = 0) {
  if (!c || depth > 6) return null;
  c = c.trim();
  const v = c.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (v) return parse(vars[v[1]] || v[2], vars, depth + 1);
  let m = c.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = c.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  const NAMED = { white: '#ffffff', black: '#000000' };
  if (NAMED[c.toLowerCase()]) return parse(NAMED[c.toLowerCase()], vars, depth + 1);
  return null; // transparent / currentColor / 渐变 / inherit —— 算不了就不算，别瞎报
}
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
function lum(c) {
  const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ── 扫所有 <style> 里的规则 ──
const rules = [];
for (const sm of src.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
  const css = sm[1].replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const decl = m[2];
    if (!/(^|;|\s)color\s*:/.test(decl) || !/background(-color)?\s*:/.test(decl)) continue;
    rules.push({ sel, decl });
  }
}

// ── 已在真浏览器里量过、确认是本脚本误判的规则 ──
// 静态算法有两个天生的盲区：① 半透明底只能往 --bg 上叠，元素实际坐在 .card / .glass-card 上时
// 结果会偏；② 内容是彩色 emoji 时字形颜色由字体决定，CSS 的 color 根本不起作用。
// 这些不改设计，但把实测值记在这里 —— 数字变了就说明有人动过配色，警报照样响。
const KNOWN = {
  '.phfab': '内容是 🧩 彩色 emoji，color 不生效；实测 2.44:1 是拿按钮 color 算的假值',
  '.lb-0': '徽章实际坐在 .card 上而非 --bg，实测浅色 4.65:1 / 深色 5.41:1，达标',
  '.glass-card .acct-input': '输入框坐在毛玻璃卡上，实测浅色 13.95:1 / 深色 13.26:1，达标',
};

// 页面底色（背景算不出来时的兜底参照）
const PAGE = { light: parse('var(--bg)', LIGHT), dark: parse('var(--bg)', DARK) };
let checked = 0;
const seen = new Set();
const skipped = new Set();
for (const { sel, decl } of rules) {
  // 只看具体元素规则；:root / ::selection / 伪元素装饰不算正文
  if (/^:root|::(selection|backdrop|placeholder)/.test(sel)) continue;
  const cm = decl.match(/(?:^|;|\s)color\s*:\s*([^;]+)/);
  const bm = decl.match(/(?:^|;|\s)background(?:-color)?\s*:\s*([^;]+)/);
  if (!cm || !bm) continue;
  const bgRaw = bm[1].trim();
  if (/gradient|url\(/.test(bgRaw)) continue;            // 渐变按哪一端算都不对，跳过
  const bgFirst = bgRaw.split(/\s+/)[0];                  // background 简写：第一个 token 是颜色
  const fsM = decl.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/);
  const bold = /font-weight\s*:\s*(bold|[6-9]00)/.test(decl);
  const fs = fsM ? +fsM[1] : 14;                          // 没写字号就按站内正文 14px 算（偏严）
  const need = (fs >= 18 || (fs >= 14 && bold)) ? 3 : 4.5;
  for (const [theme, vars] of [['浅色', LIGHT], ['深色', DARK]]) {
    const fg = parse(cm[1].trim(), vars);
    let bg = parse(bgFirst, vars);
    if (!fg || !bg) continue;
    const page = PAGE[theme === '浅色' ? 'light' : 'dark'];
    if (bg.a < 1) bg = over(bg, page);
    const r = ratio(over(fg, bg), bg);
    checked++;
    const key = sel + theme;
    if (r < need && !seen.has(key)) {
      seen.add(key);
      if (KNOWN[sel]) { skipped.add(sel); continue; }
      bad(`${theme}主题 ${sel} → ${r.toFixed(2)}:1（${fs}px${bold ? ' bold' : ''} 需 ${need}:1）· 字 ${cm[1].trim()} 底 ${bgFirst}`);
    }
  }
}

// 白名单条目失效（选择器被删/改名）时要提醒清理，否则它会一直挡着真问题
for (const k of Object.keys(KNOWN)) {
  if (!rules.some((r) => r.sel === k)) bad(`白名单里的 ${k} 已经不在 CSS 里了，请从 KNOWN 删掉`);
}
console.log(`规则级对比度体检：${rules.length} 条自带前景+背景的规则，实测 ${checked} 组（深浅各一遍）`
  + (skipped.size ? `，放行 ${skipped.size} 条已实测的误判（${[...skipped].join(' ')}）` : ''));
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 状态类配色全部达标');
