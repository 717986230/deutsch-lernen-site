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
//   D. 名词的谐音必须以冠词的谐音开头（das X 不能写成「迪 X」）
//
// 2026-09 又补一道：过敏原表把同一个词写成两遍 ——「die Krebstiere」和「B – Krebstiere」，
// 两处谐音各写各的（克雷普斯提勒 / 克雷普斯蒂尔），A 却因为 de 字符串不同而放行。
// 现在比对前先剥掉「字母 – 」前缀，这类「同词换个马甲」就跑不掉了。
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
const rows = [];          // [de, py, where] —— 供下面按词对齐的检查用
const note = (de, py, where) => {
  if (!de || !py) return;
  const k = String(de).trim();
  if (!seen.has(k)) seen.set(k, []);
  seen.get(k).push({ py: String(py).trim(), where });
  rows.push([k, String(py).trim(), where]);
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

// ── A2. 剥掉「B – 」这种字母前缀后，仍然是同一个词 ──
// 过敏原表用「B – Krebstiere」的写法，和词库里的「die Krebstiere」是同一个词，
// 谐音的**词身部分**必须一致（前面那个字母的谐音各自保留）。
const strip = (de) => de.trim().replace(/^[A-ZÄÖÜ]\s*[–-]\s*/, '').replace(/^(der|die|das)\s+/i, '');
const stripPy = (de, py) => {
  let t = py.trim();
  if (/^[A-ZÄÖÜ]\s*[–-]\s*/.test(de.trim())) t = t.replace(/^\S+\s+/, '');   // 去掉字母的谐音
  else t = t.replace(/^(德尔|迪|达斯)\s+/, '');                                 // 去掉冠词的谐音
  return t;
};
const body = new Map();
for (const [de, list] of seen) {
  const w = strip(de);
  if (/\s/.test(w)) continue;                       // 只比单词
  for (const x of list) {
    const t = stripPy(de, x.py);
    if (!body.has(w)) body.set(w, new Map());
    if (!body.get(w).has(t)) body.get(w).set(t, []);
    body.get(w).get(t).push(`${de}=${x.py}（${x.where}）`);
  }
}
let bodies = 0;
for (const [w, m] of body) {
  if (m.size < 2) continue;
  bodies++;
  bad(`「${w}」换个写法就换个谐音：` + [...m.values()].map((v) => v[0]).join('　'));
}

// ── B. 复合词词尾的词根写法必须统一 ──
// 只收「作为词尾出现、且谐音也应落在结尾」的名词词根 —— 这样匹配是精确的，
// 不会像在词中间瞎找子串那样把 Stunde 里的 und 也算进去。
const TAIL = {
  teller: '泰勒', geschirr: '格施尔', löffel: '勒费尔', tasse: '塔瑟', kanne: '卡呢',
  becher: '贝希尔', glas: '格拉斯', hundert: '洪德特', tausend: '套森特', zehn: '岑',
  // 词首 s+元音读 [z]：Sahne 一度被写成「萨讷」（当成 [s] 了），句子里却一直是「扎讷」
  sahne: '扎讷', milch: '米尔希',
  // 2026-09：这三个词根各自散着 2–3 种写法，统一后钉在这里
  tee: '特',          // Grüntee/Jasmintee/Eistee 都是「特」，曾有一处写「提」
  tiere: '提勒',      // -tiere 的词尾 -e 不吞，曾有一处写「蒂尔」
  nummer: '努默尔',   // Nummer [ˈnʊmɐ]，-er 读 [ɐ]；曾散成 努默/努梅尔/农默尔
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

// ── C. 外来词必须按**德国人实际怎么念**写，不能照抄英语读法 ──
// 典型：der Job 曾写成「约普」（德语 /j/），但德语里这个词念 [dʒɔp]；
// Black Friday 的 Friday 曾写成「弗莱塔克」—— 那是德语 Freitag 的谐音，把词译过去了。
const LOAN = {
  job: '乔普', sushi: '祖施', dashi: '达施', shampoo: '沙姆普', cloud: '克劳特',
  foul: '法乌尔', account: '阿考恩特', discounter: '迪斯考恩特尔', deadline: '德特莱因',
  computer: '康普尤特尔', party: '帕尔提', sake: '萨凯', friday: '弗莱德',
  'online-banking': '昂莱恩班金',
  // 菜单里的英文词同理。德语词尾 d 一律清化读 [t]，德国人念英文菜名也照办：
  fried: '弗莱特', red: '雷特', boiled: '博伊尔特',
  power: '帕乌尔', mochi: '莫奇', szechuan: '塞楚安', tom: '托姆', hot: '霍特',
  // 午餐菜单：Yellow 德国人念 [ˈjɛloː]（y 在词首＝[j]），Poke 念 [ˈpoːkeː] 两个音节
  yellow: '耶洛', poke: '波凯', wok: '沃克',
};
let loans = 0;
for (const [de, py, where] of rows) {
  const D = de.split(/\s+/), P = py.split(/\s+/);
  if (D.length !== P.length) continue;          // 词数对不上就不敢按位比
  for (let i = 0; i < D.length; i++) {
    const k = D[i].toLowerCase().replace(/[^a-zäöüß-]/g, '');
    const want = LOAN[k];
    if (!want) continue;
    loans++;
    const got = P[i].replace(/[，。！？、；：]/g, '');
    if (got !== want) bad(`外来词「${D[i]}」的谐音应是「${want}」，实际「${got}」（${where}）`);
  }
}

// ── E. 高频虚词在句子里只能有一种写法 ──
// A 只管「整条词条一模一样」，B 只管复合词词尾，中间漏掉最大的一块：
// 句子内部的虚词。实测 sich 被写成 西希／齐希／济赫 三种，dem 写成 登／登姆／代姆／顿姆 四种，
// zusammen 写成 楚扎门／楚萨门（后者把 s 当成 [s] 读了，站里的规则是 s+元音读 [z]）。
// 学员在两句话里看到同一个词两种拼法，只会怀疑自己记错了。
//
// 判定很保守：只看出现 ≥15 次的词，且某种写法占比 ≥75% 时才认定「其余是少数派」。
// 势均力敌的（比如 -sten 的 腾/滕 之争）一律不管 —— 那是选字口味，不是对错。
const FUNC_MIN = 15, FUNC_SHARE = 0.25;
// er- 是**前缀**（erklären/erhalten），非重读读 [ɐ]，和代词 er [eːɐ̯]=埃尔 本来就不同音。
const FUNC_EXEMPT = { er: 'er- 是非重读前缀，与代词 er 不同音，「尔」是对的' };
const tally = new Map();
for (const [de, py] of rows) {
  const d = de.split(/\s+/), q = py.split(/\s+/);
  if (d.length !== q.length) continue;              // 对不齐的没法按位比
  for (let i = 0; i < d.length; i++) {
    const k = d[i].toLowerCase().replace(/[^a-zäöüß]/g, '');
    if (!k) continue;
    const v = q[i].replace(/[，。！？、；：]+$/, '');
    if (!tally.has(k)) tally.set(k, new Map());
    if (!tally.get(k).has(v)) tally.get(k).set(v, []);
    tally.get(k).get(v).push(`${de} → ${py}`);
  }
}
let funcs = 0, funcSkip = 0;
for (const [w, m] of tally) {
  const total = [...m.values()].reduce((a, b) => a + b.length, 0);
  if (total < FUNC_MIN || m.size < 2) continue;
  const sorted = [...m].sort((a, b) => b[1].length - a[1].length);
  const minN = sorted.slice(1).reduce((a, [, l]) => a + l.length, 0);
  if (minN / total > FUNC_SHARE) continue;          // 没有明显主流，不判对错
  if (FUNC_EXEMPT[w]) { funcSkip++; continue; }
  funcs++;
  for (const [v, list] of sorted.slice(1)) {
    bad(`高频词「${w}」全站 ${total} 次里 ${sorted[0][1].length} 次写「${sorted[0][0]}」，`
      + `这 ${list.length} 处却写「${v}」：${list[0]}`);
  }
}
// 豁免项失效时要提醒清理，别让它一直挡着真问题
for (const w of Object.keys(FUNC_EXEMPT)) {
  if (!tally.has(w)) bad(`豁免表里的「${w}」在词库里已经没有了，请从 FUNC_EXEMPT 删掉`);
}

// ── D. 名词谐音必须以冠词的谐音开头 ──
// das Zitronengras 曾写成「迪 齐特龙恩格拉斯」、der Quantencomputer 写成「迪 …」，
// 卡片上直接教错性别。这条是纯机械核对，零误判。
const ART = { der: '德尔', die: '迪', das: '达斯' };
let arts = 0;
for (const [de, py, where] of rows) {
  const m = de.match(/^(der|die|das)\s/);
  if (!m) continue;
  arts++;
  const want = ART[m[1]];
  if (!py.startsWith(want + ' ')) bad(`「${de}」是 ${m[1]}，谐音却以「${py.split(/\s/)[0]}」开头，应是「${want}」（${where}）`);
}

console.log(`谐音一致性体检：${words} 个词条跨 ${new Set([...seen.values()].flat().map((x) => x.where.split('[')[0])).size} 个数据源比对，词根收尾校验 ${checked} 处，外来词读法校验 ${loans} 处，冠词核对 ${arts} 处，换皮同词比对 ${body.size} 组，高频虚词 ${tally.size} 个词位`
  + (funcSkip ? `（豁免 ${funcSkip} 个已确认的同形异音）` : ''));
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 同词谐音全站一致，复合词词根写法统一');
