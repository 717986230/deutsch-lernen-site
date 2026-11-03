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
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 内容数据全部通过');
