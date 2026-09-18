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
  + arr('const LETTERS =') + arr('const nums0') + arr('const numsBig')
  // 数字测验的题库也带谐音，之前漏了——里面 4 条一直是旧写法
  + arr('function nextNumQ()')
  // 内嵌小测（GQ_DATA）也带谐音，同样漏过一次
  + arr('var GQ_DATA=');

// ① 同词多谐音：匹配「德语词 = 谐音」/「德语词（中文）＝ 谐音」
// 词里允许夹音节连字符：自然拼读那节写的是 Va-ter / Fens-ter / Mut-ter 这种切好的形式。
// 原来的字符类不含 '-'，只能从 Va-ter 里抓到尾巴上的 ter，于是把 法特尔/芬斯特/穆特尔
// 判成「同一个词 ter 有三种谐音」——纯属误报。去掉连字符再做键，既消除误报，
// 又让切音节的写法真的参与比对（Va-ter 会和规则5 里的 Vater 对上，写歪了照样抓）。
const pairs = [...txt.matchAll(/([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*[A-Za-zÄÖÜäöüß])\s*(?:（[^）]*）)?\s*[=＝]\s*([一-鿿·]+)/g)];
// 字母表/数字表是 JS 对象数组（{n:7,de:'sieben',py:'西本'}），里面没有「=」，
// 上面那条只认「词 = 谐音」的正则整段扫不到它们 —— 于是发音页正文写 sieben=齐本、
// 数字表写 西本，两处打架也一路绿灯（本次就是这么漏出去的）。把对象写法也收进来。
for (const m of txt.matchAll(/de:'([^']+)',\s*py:'([一-鿿·]+)'/g)) pairs.push(m);
const seen = new Map();
for (const [, w, py] of pairs) {
  const key = w.replace(/-/g, '');
  if (!seen.has(key)) seen.set(key, new Map());
  seen.get(key).set(py, w);          // 记下原样写法，报错时好定位是哪一处
}
for (const [w, m] of [...seen].sort()) {
  if (m.size > 1) bad(`「${w}」在发音/数字页有 ${m.size} 种谐音：${[...m].map(([py, raw]) => `${py}（写作 ${raw}）`).join(' / ')}`);
}

// ② 规则违反：每条都是本站自己在页面上讲过的规则
const RULES = [
  ['sechzehn/sechzig 的 ch 跟在 e 后面，是 ich-Laut [ç]「希」，不是 ach-Laut「赫」',
    ['泽赫岑', '泽赫齐希', '">泽赫<']],
  ['词首 sp/st 读 [ʃp]/[ʃt]（组合表自己写着 shp/sht），谐音不能给成「斯普/斯特」',
    ['斯普/斯特', 'Sprache（语言）= 斯普拉赫']],
  ['qu 读 [kv]，谐音不能出现「夸」(=kw)、「克夫」(=kf) 或「克法」',
    ['kv夸', '克夫</td>', '克法利泰特']],
  // 只管德语 **z**=[ts]。德语**词首 s+元音**是 [z]，本站另有定论：写「扎」
  // （TAIL 的 sahne:'扎讷' 就是这条），所以 Satz=扎茨 是对的，别再混进来 ——
  // 这条规则原来把 Satz（句子）= 扎茨 也列成违规，等于用 z 的规矩去判 s。
  ['z 读 [ts]，对应汉语 c/z 系；不能用卷舌的「楚」（zu 系一律「粗」）',
    ['zu=楚', 'zu＝楚', '= 楚', '＝楚']],
  ['au 是双元音 [aʊ̯]，Pause 不能拆成「葩乌」两个音节（正确：泡泽）',
    ['葩乌']],
  ['Straße：词首 st 读「施特」，词尾 -e 读 [ə]「瑟」（正确：施特拉瑟）',
    ['斯特拉斯', '施特拉斯']],
  // 这条原来只盯「温楚万齐希」。2026-09 把 zu 系 楚→粗 全站统一之后，那条错写法变成
  // 「温粗万齐希」—— 不在名单里，守卫**静默失效**了（实测真有一条 21 – einundzwanzig 就这么溜过去）。
  // zwanzig 的 z 是 zw-=[tsv]，家族写法是「茨」（茨威 / 茨万齐希），粗 和 楚 都不对，两个都列上。
  ['复合数词里的 und 读 [ʊnt]「温特」，不能吞掉 t；zwanzig 的 zw- 写「茨」，不写「楚 / 粗」',
    ['温楚万齐希', '温粗万齐希', '菲因夫温德莱西希', '诺伊因温诺伊因齐希']],
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

// ── ④ 发音页 ↔ 词库交叉比对 ──
// 这两侧一直各管各的：发音页归本文件，词库归 verify-py-consistency，**谁也不看谁**。
// 于是同一个德语词在站里可以有两种谐音而全站绿灯——sieben 在发音页写「齐本」、
// 数字表写「西本」就是这么漏出去的（已修）。实测这道口子下藏着 13 处分歧。
// 发音页那侧已按本站自己写明的规则和同族词改齐；下面 PENDING 是剩下的词库侧分歧，
// 每条都注明该往哪边改和理由，等站长/Codex 定夺（data/*.json 按 AGENTS.md 归 Codex）。
const corpus = new Map();
const addC = (de, py) => {
  if (!de || !py) return;
  const k = de.replace(/^(der|die|das)\s+/, '').replace(/[.,!?;:]+$/, '');
  // 谐音也要去掉句末全角标点：词库里出自句子的条目会带「。」「！」，
  // 只去德语侧的 ASCII 标点会把「当克。」和「当克」判成两种写法（误报）。
  const v = py.replace(/^(德尔|迪|达斯)\s+/, '').replace(/[，。！？、；：]+$/, '');
  if (!corpus.has(k)) corpus.set(k, new Set());
  corpus.get(k).add(v);
};
for (const c2 of JSON.parse(readFileSync('data/categories.json', 'utf8'))) for (const ph of c2.phrases) addC(ph.de, ph.py);
for (const b of JSON.parse(readFileSync('data/boards.json', 'utf8'))) for (const it of b.items) addC(it[0], it[2]);

// 曾经这里有一张 PENDING 表，记着 5 处「词库与发音页教法不一」的待裁决项
// （zu=楚 24 处、Satz、Pause、Straße、richtig）。2026-09 站长授权一次性定完，
// 依据固定为：①本站发音页已写明的规则 ②词库内部多数写法与同族词一致 ③德语实际音值。
// 结果：zu 系 242 处 楚→粗、-tig 12 处 蒂希→提希、Straße 5 处 补回词尾「瑟」、
// Pause 葩乌斯→泡泽、发音页 Satz 萨茨→扎茨（词首 s 是 [z]，按 TAIL 的 扎 系）。
// 表已清空 —— 从此这些词由下面的交叉比对永久盯住，再分叉就直接报错。
const PENDING = {};
let crossed = 0, pend = 0;
for (const [w, m] of seen) {
  if (!corpus.has(w)) continue;
  crossed++;
  const cs = corpus.get(w);
  const ps = [...m.keys()];
  if (ps.some((x) => cs.has(x))) continue;              // 有一种写法对得上就算一致
  if (PENDING[w] && cs.has(PENDING[w])) { pend++; continue; }
  bad(`「${w}」发音页写「${ps.join('/')}」，词库却写「${[...cs].join('/')}」—— 同一个词两种教法`);
}

console.log(`发音/数字谐音体检：比对 ${seen.size} 个词、${RULES.length} 条规则，`
  + `与词库交叉比对 ${crossed} 个词` + (pend ? `（${pend} 处词库侧分歧待裁决）` : ''));
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 发音与数字谐音全部通过');
