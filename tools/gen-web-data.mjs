// 从 src.html 抽出 Vue 端要用的静态内容，写进 web/public/data/。
//
// 起因：web/public/data/reference.json 当初是**手工抽一次**放进去的，仓库里没有生成脚本。
// 结果是它和 src.html 无声脱节——2026-08 校正发音谐音时，src.html 改了 22 处，
// reference.json 里有 9 处仍是旧的错写法，Vue 端照旧教错。
// 这个脚本把「抽取」变成构建的一步，改 src.html 就一定同步，漂不了。
//
// 产出三个文件：
//   reference.json  发音/数字/语法三页的静态 HTML（de/en 两份）
//   letters.json    字母表 30 张卡的数据（旧站由 JS 从 LETTERS 数组渲染，抽 HTML 抽不到）
//   numbers.json    0–12 与大数两组卡片的数据（同上，来自 nums0 / numsBig）
//   quizzes.json    发音/语法页里的「即学即练」题池（来自 GQ_DATA，同样是运行时渲染）
//   links.json      连载页底部的「正版视频资源」导航（来自 SERIES_LINKS）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 路径按脚本自身定位：根构建在仓库根跑，web 构建在 web/ 里跑，两处 cwd 不同
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
const OUT = join(ROOT, 'web/public/data') + '/';
// 新克隆的仓库里 web/public/data/ 还不存在（它是 .gitignore 掉的构建产物）
mkdirSync(OUT, { recursive: true });

// ── ① 三页静态 HTML ──
// 取版块内 .container 的整块，剥掉内联事件与 id：
// v-html 不会执行 onclick，留着只是死代码；id 会和 Vue 端的元素撞车。
function sectionHtml(id) {
  const i = src.indexOf(`<div id="${id}" class="section">`);
  if (i < 0) throw new Error(`找不到版块 #${id}`);
  // 边界：下一个版块 / 下一段注释 / 下一个顶层 <script>（最后一个版块后面只有它）
  const cands = ['\n<div id="', '\n<!-- ', '\n<script'].map((m) => src.indexOf(m, i + 10));
  const stop = Math.min(...cands.filter((x) => x > 0));
  let html = src.slice(i, stop);
  const a = html.indexOf('<div class="container">');
  html = html.slice(a, html.lastIndexOf('</div>'));
  return html
    .replace(/\s+on(?:click|input|change|keydown|submit)="[^"]*"/g, '')
    .replace(/\s+id="[^"]*"/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}
const reference = {
  pron: { de: sectionHtml('pronunciation'), en: sectionHtml('en-pron') },
  numbers: { de: sectionHtml('numbers'), en: sectionHtml('en-num') },
  grammar: { de: sectionHtml('grammar'), en: sectionHtml('en-grammar') },
};

// ── ② JS 数组：字母表 / 数字卡 ──
// 这两组是旧站在运行时渲染的（renderLetterGrid / renderNumGrid），
// 不在静态 HTML 里，所以必须单独抽，否则 Vue 端的发音页会少 30 张字母卡、
// 数字页会少 13 张 0–12 卡 —— 正是这两页的主体内容。
// 对象字面量版（GQ_DATA 是 {} 不是 []）
function jsArrayObj(decl) {
  const i = src.indexOf(decl);
  if (i < 0) throw new Error(`找不到 ${decl}`);
  const s = src.indexOf('{', i);
  let depth = 0, end = -1;
  for (let k = s; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) { end = k + 1; break; } }
  }
  return Function(`"use strict";return (${src.slice(s, end)})`)();
}
function jsArray(decl) {
  const i = src.indexOf(decl);
  if (i < 0) throw new Error(`找不到数组 ${decl}`);
  const s = src.indexOf('[', i);
  let depth = 0, end = -1;
  for (let k = s; k < src.length; k++) {
    if (src[k] === '[') depth++;
    else if (src[k] === ']') { depth--; if (!depth) { end = k + 1; break; } }
  }
  // 源码是 JS 字面量（单引号、无引号键），用 Function 求值而不是 JSON.parse
  return Function(`"use strict";return (${src.slice(s, end)})`)();
}
const letters = jsArray('const LETTERS =');
const numbers = { small: jsArray('const nums0'), big: jsArray('const numsBig') };
// 内嵌小测：页面里是 <div class="gq-box" data-gq="p1"> 这样的空壳，题目全在 GQ_DATA 里
const quizzes = jsArrayObj('var GQ_DATA=');
const links = jsArray('const SERIES_LINKS=');

const write = (name, obj) => {
  writeFileSync(OUT + name, JSON.stringify(obj));
  console.log(`  web/public/data/${name}  ${(JSON.stringify(obj).length / 1024).toFixed(1)}KB`);
};
console.log('抽取 Vue 端静态数据：');
write('reference.json', reference);
write('letters.json', letters);
write('numbers.json', numbers);
write('quizzes.json', quizzes);
write('links.json', links);
console.log(`  字母 ${letters.length} 个 · 数字 ${numbers.small.length} + ${numbers.big.length} 张卡`
  + ` · 小测 ${Object.keys(quizzes).length} 组共 ${Object.values(quizzes).reduce((a, v) => a + v.length, 0)} 题`
  + ` · 视频资源 ${links.length} 条`);
