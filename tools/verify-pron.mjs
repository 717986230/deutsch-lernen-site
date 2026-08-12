// 发音页 / 数字页的谐音体检。
//
// 起因：这两页的谐音是手写的，攒了一批「自己打自己脸」的错——
// 组合表写着「词首 sp/st 读 shp/sht」，谐音栏却给「斯普/斯特」，正好是它要纠正的读法；
// 字母 Q 行警告「不是 kw」，谐音却写「夸」；同一个 schön 在同一页有「修恩」和「舍恩」两种写法。
// 这类错肉眼扫不出来（分散在 HTML 表格和 JS 数组里），只有逐条比对才会暴露。
//
// 两类检查：
//   ① 同一个德语词在两页里不能出现两种谐音；
//   ② 几条本站自己讲过的发音规则，谐音不许违反。
import { readFileSync } from 'node:fs';

const s = readFileSync('src.html', 'utf8');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

// 取两个版块 + 三个 JS 数据数组（字母表/数字都写在脚本里，不在 section 内）
function section(id) {
  const i = s.indexOf(`id="${id}"`);
  return i < 0 ? '' : s.slice(i, s.indexOf('<div id="', i + 10));
}
function arr(name) {
  const i = s.indexOf(name);
  return i < 0 ? '' : s.slice(i, s.indexOf('];', i));
}
const txt = section('pronunciation') + section('numbers')
  + arr('const LETTERS =') + arr('const nums0') + arr('const numsBig');

// ① 同词多谐音：匹配「德语词 = 谐音」/「德语词（中文）＝ 谐音」
const pairs = [...txt.matchAll(/([A-Za-zÄÖÜäöüß]{2,})\s*(?:（[^）]*）)?\s*[=＝]\s*([一-鿿·]+)/g)];
const seen = new Map();
for (const [, w, py] of pairs) {
  if (!seen.has(w)) seen.set(w, new Set());
  seen.get(w).add(py);
}
for (const [w, set] of [...seen].sort()) {
  if (set.size > 1) bad(`「${w}」在发音/数字页有 ${set.size} 种谐音：${[...set].join(' / ')}`);
}

// ② 规则违反：每条都是本站自己在页面上讲过的规则
const RULES = [
  ['sechzehn/sechzig 的 ch 跟在 e 后面，是 ich-Laut [ç]「希」，不是 ach-Laut「赫」',
    ['泽赫岑', '泽赫齐希', '">泽赫<']],
  ['词首 sp/st 读 [ʃp]/[ʃt]（组合表自己写着 shp/sht），谐音不能给成「斯普/斯特」',
    ['斯普/斯特', 'Sprache（语言）= 斯普拉赫']],
  ['qu 读 [kv]，谐音不能出现「夸」(=kw)、「克夫」(=kf) 或「克法」',
    ['kv夸', '克夫</td>', '克法利泰特']],
  ['z 读 [ts]，对应汉语 c/z 系；不能用卷舌的「楚 / 扎」',
    ['zu=楚', 'zu＝楚', 'Satz（句子）= 扎茨']],
  ['au 是双元音 [aʊ̯]，Pause 不能拆成「葩乌」两个音节',
    ['葩乌泽']],
  ['Straße：词首 st 读「施特」，词尾 -e 读 [ə]「瑟」',
    ['斯特拉斯']],
];
for (const [desc, pats] of RULES) {
  const hit = pats.filter((p) => txt.includes(p));
  if (hit.length) bad(`${desc} —— 仍存在：${hit.join('、')}`);
}

// ③ 数字：独立词与 13–19 / 20–90 规律表必须用同一套谐音
const nums = Object.fromEntries(
  [...s.matchAll(/\{n:[^,]+,de:'([^']+)',py:'([^']+)'\}/g)].map((m) => [m[1], m[2]]));
for (const [de, tens, ones] of [['vier', '十四', '四十'], ['fünf', '十五', '五十'],
  ['sieben', '十七', '七十'], ['sechs', '十六', '六十']]) {
  const stem = { vier: '菲尔', 'fünf': '芬夫', sieben: '西普', sechs: '泽希' }[de];
  for (const [label, suffix] of [[tens, '岑'], [ones, '齐希']]) {
    const need = `${label}</span><span class="rule-py">${stem}`;
    if (!s.includes(need)) bad(`数字规律表「${label}」的词干应为「${stem}」（与 ${de} 一致）`);
  }
}
if (nums.vier && nums.vier !== '菲尔') bad(`vier 独立词谐音「${nums.vier}」与规律表「菲尔」不一致`);
if (nums['fünf'] && nums['fünf'] !== '芬夫') bad(`fünf 独立词谐音「${nums['fünf']}」与规律表「芬夫」不一致`);

console.log(`发音/数字谐音体检：比对 ${seen.size} 个词、${RULES.length} 条规则`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 发音与数字谐音全部通过');
