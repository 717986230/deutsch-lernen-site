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


// ② 字母表：与 src.html 的 LETTERS 一一对应
const letters = rd('letters.json');
if (letters.length !== 30) bad(`letters.json 有 ${letters.length} 个字母，应为 30`);
for (const x of letters) {
  for (const k of ['l', 'name', 'sound', 'say']) if (!String(x[k] || '').trim()) bad(`字母「${x.l}」缺 ${k}`);
}
// ③ 数字卡：按语言分组，组数必须和页面里的占位坑数一致，
//    否则会出现「英语页铺德语数字」这种串台。
const nums = rd('numbers.json');
const slots = {
  de: (ref.numbers.de.match(/<div class="num-grid"><\/div>/g) || []).length,
  en: (ref.numbers.en.match(/<div class="num-grid"><\/div>/g) || []).length,
};
for (const lang of ['de', 'en']) {
  const g = nums[lang];
  if (!Array.isArray(g)) { bad(`numbers.json 缺 ${lang} 分组`); continue; }
  if (g.length !== slots[lang]) bad(`numbers.json ${lang} 有 ${g.length} 组，但页面上有 ${slots[lang]} 个 num-grid 占位`);
  if (!g.length || g.some((a) => !a.length)) bad(`numbers.json ${lang} 有空分组`);
  for (const x of g.flat()) {
    for (const k of ['de', 'py']) if (!String(x[k] || '').trim()) bad(`${lang} 数字「${x.n}」缺 ${k}`);
  }
}
// 德语第一组必须是 0–12；英语第一组是 1–12（两边基数不同，分别钉住）
if (nums.de && nums.de[0] && nums.de[0].length !== 13) bad(`德语第一组应为 13 张（0–12），实际 ${nums.de[0].length}`);
if (nums.en && nums.en[0] && nums.en[0].length !== 12) bad(`英语第一组应为 12 张（1–12），实际 ${nums.en[0].length}`);
// 串台守卫：英语的卡里不能出现德语数词
if (nums.en && JSON.stringify(nums.en).includes('"eins"')) bad('英语数字组里混进了德语数词');

// ④ 抽出来的谐音必须是校正后的版本 —— 这是当初脱节的直接症状，单独钉一遍
const all = JSON.stringify(ref) + JSON.stringify(letters) + JSON.stringify(nums);
const STALE = ['葩乌泽', 'kv夸', '修恩', '格吕因', '斯特拉斯', '斯普/斯特', '扎茨', '克法利泰特', '泽赫岑', '集普', '菲因夫'];
for (const s of STALE) if (all.includes(s)) bad(`抽出来的数据里仍有旧写法「${s}」——多半是 src.html 没同步改`);

console.log(`web 端抽取数据体检：3 页 × 2 语言 · 字母 ${letters.length} · 数字卡 德 ${nums.de.map((a) => a.length).join('+')} / 英 ${nums.en.map((a) => a.length).join('+')}`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK web 端抽取数据全部通过');
