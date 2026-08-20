// 谐音一致性体检：同一个词在全站只能有一种谐音写法。
//
// 起因是两天里撞见两次，都是人眼偶然发现的：
//   · der Teller —— categories.json 写「德尔 特勒」，boards.json 写「德尔 泰勒」
//   · das Geschirr —— 写成「达斯 格希尔」，但同词根在 das Einweggeschirr 里是「格施尔」
//     （Geschirr [ɡəˈʃɪʁ] 的 sch 是 ʃ，站内一律「施」；「希」是 ç，混了）
// 已有的 verify-data 也查「同词不同谐音」，但**只在单个文件内**比，跨文件、跨词根全漏。
//
// 这里补两道：
//   A. 同一个德语词条，跨所有数据源必须谐音完全相同（零误判）
//   B. 复合词的词尾词根，谐音也必须以该词根的标准写法收尾
//      （Suppenteller 必须以「泰勒」结尾，Einweggeschirr 必须以「格施尔」结尾）
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const rd = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));

// ── 收集所有「德语 → 谐音」的出处 ──
// 德语和英语的谐音是两套体系，分开收，不能互相比。
const seen = new Map();   // de → [{py, where}]
const note = (de, py, where) => {
  if (!de || !py) return;
  const k = String(de).trim();
  if (!seen.has(k)) seen.set(k, []);
  seen.get(k).push({ py: String(py).trim(), where });
};

for (const f of ['data/categories.json', 'data/readings.json', 'data/series.json', 'data/dialogs.json']) {
  if (!existsSync(join(ROOT, f))) continue;
  const j = rd(f);
  if (f.endsWith('categories.json')) {
    for (const c of j) for (const p of c.phrases) note(p.de, p.py, `${f}[${c.name}]`);
  } else if (f.endsWith('dialogs.json')) {
    for (const d of j) for (const t of d.turns) note(t.de, t.py, `${f}[${d.scene}]`);
  } else {
    for (const a of j) for (const p of a.paras) note(p[0], p[2], `${f}[${a.title}]`);
  }
}
for (const b of rd('data/boards.json')) for (const it of b.items) note(it[0], it[2], `boards.json[${b.name}]`);

// src.html 里还有几张只存在于代码里的表
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');
const literal = (name) => {
  const m = src.match(new RegExp('(?:const|var) ' + name + ' ?= ?\\[([\\s\\S]*?)\\n\\];'));
  return m ? new Function('return [' + m[1] + '\n]')() : null;
};
for (const p of literal('BODY_PARTS') || []) note(p.de, p.py, 'src.html[BODY_PARTS]');
for (const n of ['nums0', 'numsBig']) for (const x of literal(n) || []) note(x.de, x.py, `src.html[${n}]`);

// ── A. 同词跨文件必须同谐音 ──
let words = 0;
for (const [de, list] of seen) {
  words++;
  const uniq = [...new Set(list.map((x) => x.py))];
  if (uniq.length > 1) {
    bad(`「${de}」有 ${uniq.length} 种谐音：` + list.map((x) => `${x.py}（${x.where}）`).join('　'));
  }
}

// ── B. 复合词词尾的词根写法必须统一 ──
// 只收「作为词尾出现、且谐音也应落在结尾」的名词词根 —— 这样匹配是精确的，
// 不会像在词中间瞎找子串那样把 Stunde 里的 und 也算进去。
const TAIL = {
  teller: '泰勒', geschirr: '格施尔', löffel: '勒费尔', tasse: '塔瑟', kanne: '卡呢',
  becher: '贝希尔', glas: '格拉斯', hundert: '洪德特', tausend: '套森特', zehn: '岑',
};
let checked = 0;
for (const [de, list] of seen) {
  const w = de.trim().toLowerCase().replace(/^(der|die|das)\s+/, '');
  if (/\s/.test(w)) continue;                       // 只看单词，不看短语句子
  for (const [root, py] of Object.entries(TAIL)) {
    if (!w.endsWith(root)) continue;
    checked++;
    for (const x of list) {
      if (!x.py.endsWith(py)) {
        bad(`「${de}」以 -${root} 结尾，谐音应以「${py}」收尾，实际「${x.py}」（${x.where}）`);
      }
    }
    break;                                          // 命中最长的一个就够
  }
}

console.log(`谐音一致性体检：${words} 个词条跨 ${new Set([...seen.values()].flat().map((x) => x.where.split('[')[0])).size} 个数据源比对，词根收尾校验 ${checked} 处`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 同词谐音全站一致，复合词词根写法统一');
