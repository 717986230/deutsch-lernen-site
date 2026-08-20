// 图卡词表有两份，必须一字不差：
//   · src.html —— 旧站（生产）用。人体在 BODY_PARTS，其余 6 板在 PIC_BOARDS
//   · data/boards.json —— Vue 端用（vite 把整个 data/ 拷进 public/）
// 这是 data/reference.json 那个坑的翻版：同一份内容抄两处、谁也不校验，
// 早晚一边改了另一边没改，然后「明明改了图标怎么没变」。
//
// 顺便挡住图卡测验的一个真坑：boardAns 的四选一只显示 emoji + **中文**，
// 中文重复就会出现两个都对的选项，用户点对了也判错。
// （「同一张图对应多个词」这件事本身不算错 —— emoji 就那么多，
//   由 buildBoardQuiz 保证同图的词不会同时出现在四个选项里，
//   见 tools/verify-board-quiz.mjs。）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };
const src = readFileSync(join(ROOT, 'src.html'), 'utf8');

function literal(name, open, close) {
  const m = src.match(new RegExp('var ' + name + '=\\' + open + '([\\s\\S]*?)\\n\\' + close + ';'));
  if (!m) { console.error(`ERROR src.html 里找不到 ${name}`); process.exit(1); }
  // 纯数据字面量，不引用任何外部变量
  return new Function('return ' + open + m[1] + '\n' + close)();
}
const BODY = literal('BODY_PARTS', '[', ']');
const PIC = literal('PIC_BOARDS', '[', ']');

// src.html 侧的期望值：koerper 走 BODY_PARTS，其余走 PIC_BOARDS 自带的 items
const expect = PIC.map((b) => ({
  id: b.id, name: b.name,
  items: b.id === 'koerper' ? BODY.map((p) => [p.de, p.zh, p.py, p.em]) : (b.items || []),
}));

const boards = JSON.parse(readFileSync(join(ROOT, 'data/boards.json'), 'utf8'));
if (boards.length !== expect.length) bad(`板数对不上：src.html ${expect.length} 个，boards.json ${boards.length} 个`);

let total = 0;
for (const e of expect) {
  const j = boards.find((b) => b.id === e.id);
  if (!j) { bad(`boards.json 缺板 ${e.id}`); continue; }
  total += e.items.length;

  // ── ① 两份逐条一致（含顺序）──
  if (e.items.length !== j.items.length) {
    bad(`${e.name}：条数对不上，src.html ${e.items.length} 条 vs boards.json ${j.items.length} 条`);
  } else {
    e.items.forEach((it, i) => {
      if (it.join(' ') !== j.items[i].join(' ')) {
        bad(`${e.name} 第 ${i + 1} 条不一致：src.html「${it.join('|')}」 vs boards.json「${j.items[i].join('|')}」`);
      }
    });
  }

  // ── ② 四个字段都不能空 ──
  e.items.forEach((p, i) => ['de', 'zh', 'py', 'em'].forEach((k, x) => {
    if (!String(p[x] || '').trim()) bad(`${e.name} 第 ${i + 1} 条（${p[0] || '?'}）缺 ${k}`);
  }));

  // ── ③ 同一板内德语词与中文都不能重复 ──
  // 德语重复＝白占一格；中文重复＝测验四选一会出现两个正确答案。
  for (const [idx, label] of [[0, '德语词'], [1, '中文']]) {
    const seen = new Map();
    e.items.forEach((p, i) => {
      if (seen.has(p[idx])) bad(`${e.name} ${label}「${p[idx]}」重复：第 ${seen.get(p[idx]) + 1} 条与第 ${i + 1} 条`);
      else seen.set(p[idx], i);
    });
  }

  // ── ④ 谐音格式：以冠词谐音开头、不夹拉丁字母、标点用全角 ──
  const ART = { der: '德尔', die: '迪', das: '达斯' };
  e.items.forEach((p, i) => {
    const [de, , py] = p;
    const art = (de.match(/^(der|die|das)\s/) || [])[1];
    if (art && !py.startsWith(ART[art] + ' ')) bad(`${e.name} 第 ${i + 1} 条（${de}）谐音应以「${ART[art]} 」开头，实际「${py}」`);
    if (/[A-Za-z]/.test(py)) bad(`${e.name} 第 ${i + 1} 条（${de}）谐音里混进了拉丁字母：「${py}」`);
    if (/[,.!?;:()]/.test(py)) bad(`${e.name} 第 ${i + 1} 条（${de}）谐音要用全角标点：「${py}」`);
  });
}

console.log(`图卡词表体检：${expect.length} 个板共 ${total} 条，src.html 与 data/boards.json 逐条比对`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 两份图卡词表一致，无重复、谐音格式正确');
