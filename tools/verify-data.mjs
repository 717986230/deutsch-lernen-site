// 内容数据体检：字段完整性、谐音规范、同词一致性。
// 起因：手写英语短文时谐音里混进了西里尔字母和英文残留（паундз / change德），
// 肉眼扫不出来，只有逐字符校验才会暴露。
import { readFileSync, existsSync } from 'node:fs';

// 谐音允许：中文、空白、全角标点，以及三个有实义的符号——
// 「/」并列写法（die Sauce / die Soße）、「-」复合词分隔、「↔」反义词对、「—」破折号
const CJK = /^[一-鿿\s，。！？、；：「」（）·/\-↔—]+$/;
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const rd = (p) => JSON.parse(readFileSync(p, 'utf8'));

function checkPhrases(path) {
  if (!existsSync(path)) return;
  const d = rd(path);
  const py = new Map();
  let n = 0;
  for (const c of d) {
    for (const p of c.phrases) {
      n++;
      for (const k of ['de', 'zh', 'py']) if (!String(p[k] || '').trim()) bad(`${path} [${c.name}] 「${p.de}」缺 ${k}`);
      if (p.py && !CJK.test(p.py)) bad(`${path} [${c.name}] 「${p.de}」谐音含非中文字符: ${p.py}`);
      const key = p.de.trim();
      if (py.has(key) && py.get(key) !== p.py.trim()) bad(`${path} 「${key}」同词不同谐音: ${py.get(key)} / ${p.py}`);
      py.set(key, p.py.trim());
    }
  }
  console.log(`  ${path}: ${d.length} 分类 ${n} 条`);
}
function checkArticles(path, withPy) {
  if (!existsSync(path)) return;
  const d = rd(path);
  const py = new Map();
  let n = 0, short = 0;
  for (const a of d) {
    if (a.paras.length < 7) short++;
    for (const p of a.paras) {
      n++;
      if (!String(p[0] || '').trim() || !String(p[1] || '').trim()) bad(`${path} [${a.title}] 句子缺原文或译文`);
      if (withPy) {
        if (!String(p[2] || '').trim()) bad(`${path} [${a.title}] 「${p[0]}」缺谐音`);
        else if (!CJK.test(p[2])) bad(`${path} [${a.title}] 「${p[0]}」谐音含非中文字符: ${p[2]}`);
        const k = p[0].trim();
        if (py.has(k) && py.get(k) !== p[2].trim()) bad(`${path} 「${k}」同句不同谐音`);
        py.set(k, (p[2] || '').trim());
      }
    }
  }
  console.log(`  ${path}: ${d.length} 篇 ${n} 句${short ? `（${short} 篇少于 7 句）` : ''}`);
}
function checkDialogs(path) {
  if (!existsSync(path)) return;
  const d = rd(path);
  let n = 0;
  for (const x of d) {
    for (const k of ['icon', 'scene', 'lv', 'de', 'turns']) if (!x[k]) bad(`${path} 对话缺字段 ${k}`);
    for (const t of x.turns) {
      n++;
      for (const k of ['s', 'de', 'zh', 'py']) if (!String(t[k] || '').trim()) bad(`${path} [${x.scene}] 缺 ${k}`);
      if (t.py && !CJK.test(t.py)) bad(`${path} [${x.scene}] 「${t.de}」谐音含非中文字符: ${t.py}`);
    }
  }
  console.log(`  ${path}: ${d.length} 段 ${n} 轮`);
}
// 餐厅特训（2026-11）：情景句 + 对话 + 奥地利菜单，三块都必须带谐音
function checkResto(path) {
  if (!existsSync(path)) return;
  const d = rd(path);
  let n = 0;
  const row = (where, x) => {
    n++;
    for (const k of ['de', 'zh', 'py']) if (!String(x[k] || '').trim()) bad(`${path} [${where}] 「${x.de}」缺 ${k}`);
    if (x.py && !CJK.test(x.py)) bad(`${path} [${where}] 「${x.de}」谐音含非中文字符: ${x.py}`);
  };
  for (const u of d.units) {
    for (const k of ['id', 'icon', 'name', 'tip', 'phrases', 'dialogs']) if (!u[k]) bad(`${path} 单元缺字段 ${k}`);
    if (u.phrases.filter((p) => !p.k).length < 4) bad(`${path} [${u.name}] 客人句少于 4 条，测验凑不齐选项`);
    for (const p of u.phrases) row(u.name, p);
    for (const g of u.dialogs) for (const t of g.turns) {
      if (t.s !== 'A' && t.s !== 'B') bad(`${path} [${g.title}] s 只能是 A（服务员）/B（客人）`);
      row(g.title, t);
    }
  }
  for (const g of d.menu) for (const it of g.items) {
    row(g.group, it);
    if (!/^(der|die|das) /.test(it.de)) bad(`${path} [${g.group}] 「${it.de}」菜名要带冠词`);
    if (it.p != null && !(it.p > 0 && Math.round(it.p * 100) % 10 === 0)) bad(`${path} 「${it.de}」价格要是整角: ${it.p}`);
  }
  console.log(`  ${path}: ${d.units.length} 单元 ${d.menu.length} 组菜单 ${n} 条`);
}
// 动词搭配（2026-11）：搭配本身必须以所属动词结尾（练习里要把动词挖空），例句三元素都带谐音
function checkKolloc(path) {
  if (!existsSync(path)) return;
  const d = rd(path);
  let n = 0;
  const seenDe = new Set();
  for (const v of d.verbs) {
    for (const k of ['v', 'zh', 'py', 'tip', 'items']) if (!v[k]) bad(`${path} 动词缺字段 ${k}`);
    for (const it of v.items) {
      n++;
      for (const k of ['de', 'zh', 'py']) if (!String(it[k] || '').trim()) bad(`${path} [${v.v}] 「${it.de}」缺 ${k}`);
      if (it.py && !CJK.test(it.py)) bad(`${path} [${v.v}] 「${it.de}」谐音含非中文字符: ${it.py}`);
      if (!new RegExp('\\s' + v.v + '$').test(it.de)) bad(`${path} 「${it.de}」要以 ${v.v} 结尾（练习靠它挖空）`);
      if (seenDe.has(it.de)) bad(`${path} 「${it.de}」重复`);
      seenDe.add(it.de);
      if (!Array.isArray(it.ex) || it.ex.length !== 3 || it.ex.some((x) => !String(x || '').trim())) bad(`${path} 「${it.de}」例句要是 [de, zh, py]`);
      else if (!CJK.test(it.ex[2])) bad(`${path} 「${it.de}」例句谐音含非中文字符`);
    }
  }
  if (d.verbs.length < 4) bad(`${path} 动词少于 4 个，练习凑不齐选项`);
  console.log(`  ${path}: ${d.verbs.length} 个动词 ${n} 组搭配`);
}
// 分组高频词（2026-11）：每组要有图标/名称/说明，每个词 de/zh/py 齐全、谐音全中文，德语不重复；
// 名词一律带 der/die/das（练习和上色都靠它），组内至少 4 个词才凑得齐四选一。
function checkWortschatz(path) {
  if (!existsSync(path)) return;
  const d = rd(path);
  let n = 0;
  const seen = new Set(), ids = new Set();
  for (const g of d.groups) {
    for (const k of ['id', 'icon', 'name', 'tip']) if (!String(g[k] || '').trim()) bad(`${path} 分组缺字段 ${k}`);
    if (ids.has(g.id)) bad(`${path} 分组 id「${g.id}」重复`);
    ids.add(g.id);
    if (!Array.isArray(g.words) || g.words.length < 4) bad(`${path} [${g.name}] 少于 4 个词`);
    for (const w of g.words || []) {
      n++;
      for (const k of ['de', 'zh', 'py']) if (!String(w[k] || '').trim()) bad(`${path} [${g.name}] 「${w.de}」缺 ${k}`);
      if (w.py && !CJK.test(w.py)) bad(`${path} [${g.name}] 「${w.de}」谐音含非中文字符: ${w.py}`);
      if (/^(der|die|das)\s/.test(w.de) && !/^(德尔|迪|达斯)\s/.test(w.py)) bad(`${path} 「${w.de}」谐音要以冠词谐音开头`);
      if (seen.has(w.de)) bad(`${path} 「${w.de}」重复`);
      seen.add(w.de);
    }
  }
  console.log(`  ${path}: ${d.groups.length} 组 ${n} 个词`);
}
// 词缀情景记忆（2026-11）：故事里每个 {词} 都要在 words 里有解析，词都以词根结尾、以前缀开头
function checkAffix(path) {
  if (!existsSync(path)) return;
  const d = rd(path);
  let n = 0;
  for (const r of d.roots) {
    for (const k of ['id', 'icon', 'title', 'v', 'zh', 'py', 'story', 'words']) if (!r[k]) bad(`${path} 词根缺字段 ${k}`);
    const used = r.story.flatMap((s) => [...s.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]));
    const ws = r.words.map((w) => w.de);
    for (const u of used) if (!ws.includes(u)) bad(`${path} [${r.v}] 故事里的「${u}」没有解析`);
    for (const w of ws) if (!used.includes(w)) bad(`${path} [${r.v}] 「${w}」没出现在故事里`);
    for (const w of r.words) {
      n++;
      for (const k of ['de', 'zh', 'py', 'n']) if (!String(w[k] || '').trim()) bad(`${path} [${r.v}] 「${w.de}」缺 ${k}`);
      if (w.py && !CJK.test(w.py)) bad(`${path} 「${w.de}」谐音含非中文字符: ${w.py}`);
      if (!w.de.endsWith(r.v)) bad(`${path} 「${w.de}」要以词根 ${r.v} 结尾`);
      if (w.pre && (!d.prefixes[w.pre] || !w.de.startsWith(w.pre))) bad(`${path} 「${w.de}」前缀 ${w.pre} 不在前缀表里或对不上`);
      if (!Array.isArray(w.ex) || w.ex.length !== 3 || w.ex.some((x) => !String(x || '').trim())) bad(`${path} 「${w.de}」例句要是 [de, zh, py]`);
      else if (!CJK.test(w.ex[2])) bad(`${path} 「${w.de}」例句谐音含非中文字符`);
    }
  }
  console.log(`  ${path}: ${d.roots.length} 个词根 ${n} 个词`);
}
console.log('内容数据体检：');
checkPhrases('data/categories.json');
checkPhrases('data/en_categories.json');
checkArticles('data/readings.json', true);
checkArticles('data/en_readings.json', true);
checkArticles('data/series.json', true);   // 2026-08 起连载也全量带谐音
checkArticles('data/en_series.json', true);  // 2026-10 英语连载补齐 12 集并带谐音
checkDialogs('data/dialogs.json');
checkDialogs('data/en_dialogs.json');
checkResto('data/restaurant.json');
checkKolloc('data/kolloc.json');
checkWortschatz('data/wortschatz.json');
checkAffix('data/affix.json');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 内容数据全部通过');
