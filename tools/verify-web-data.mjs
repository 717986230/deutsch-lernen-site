// 校验 web/public/data/ 里从 src.html 抽出来的三个文件。
//
// 背景：web/public/data/ 是 .gitignore 掉的**构建产物**（vite 的 copyData 插件把仓库根的
// data/ 复制进去）。而 reference.json 当初是有人手工抽一次放在本地工作区的，
// 既没进仓库、也没有生成脚本 —— 于是两件事同时成立：
//   ① 新克隆的仓库里它根本不存在，构建出来的 Vue 发音/数字/语法页是空的；
//   ② 老工作区里它和 src.html 无声脱节（2026-08 校正 22 处发音谐音后，它还留着 9 处旧写法）。
// 现在抽取归 tools/gen-web-data.mjs 管，本脚本负责校验它跑出来的东西是对的。
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

execFileSync(process.execPath, [join(ROOT, 'tools/gen-web-data.mjs')], { stdio: 'pipe' });
const rd = (f) => JSON.parse(readFileSync(join(ROOT, 'web/public/data', f), 'utf8'));

// ① 三页静态 HTML
const ref = rd('reference.json');
for (const topic of ['pron', 'numbers', 'grammar']) {
  for (const lang of ['de', 'en']) {
    const h = (ref[topic] || {})[lang];
    if (!h) { bad(`reference.json 缺 ${topic}/${lang}`); continue; }
    if (!h.startsWith('<div class="container">')) bad(`${topic}/${lang} 不是以 .container 开头`);
    // v-html 不执行内联事件，留着是死代码；id 会和 Vue 端元素撞车
    if (h.includes('onclick')) bad(`${topic}/${lang} 残留 onclick`);
    if (h.includes(' id=')) bad(`${topic}/${lang} 残留 id`);
    if (h.length < 1500) bad(`${topic}/${lang} 只有 ${h.length} 字符，疑似截断`);
  }
}
// 字母卡/数字卡的占位坑必须还在，否则 Reference.vue 填不进去
if (!ref.pron.de.includes('<div class="letter-grid"></div>')) bad('pron/de 里没有 letter-grid 占位');
if ((ref.numbers.de.match(/<div class="num-grid"><\/div>/g) || []).length !== 2) bad('numbers/de 的 num-grid 占位不是 2 个');

// ② 字母表：与 src.html 的 LETTERS 一一对应
const letters = rd('letters.json');
if (letters.length !== 30) bad(`letters.json 有 ${letters.length} 个字母，应为 30`);
for (const x of letters) {
  for (const k of ['l', 'name', 'sound', 'say']) if (!String(x[k] || '').trim()) bad(`字母「${x.l}」缺 ${k}`);
}
// ③ 数字卡
const nums = rd('numbers.json');
if (nums.small.length !== 13) bad(`numbers.json small 有 ${nums.small.length} 张，应为 13（0–12）`);
if (!nums.big.length) bad('numbers.json big 为空');
for (const x of [...nums.small, ...nums.big]) {
  for (const k of ['de', 'py']) if (!String(x[k] || '').trim()) bad(`数字「${x.n}」缺 ${k}`);
}

// ④ 抽出来的谐音必须是校正后的版本 —— 这是当初脱节的直接症状，单独钉一遍
const all = JSON.stringify(ref) + JSON.stringify(letters) + JSON.stringify(nums);
const STALE = ['葩乌泽', 'kv夸', '修恩', '格吕因', '斯特拉斯', '斯普/斯特', '扎茨', '克法利泰特', '泽赫岑', '集普', '菲因夫'];
for (const s of STALE) if (all.includes(s)) bad(`抽出来的数据里仍有旧写法「${s}」——多半是 src.html 没同步改`);

console.log(`web 端抽取数据体检：3 页 × 2 语言 · 字母 ${letters.length} · 数字 ${nums.small.length}+${nums.big.length}`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK web 端抽取数据全部通过');
