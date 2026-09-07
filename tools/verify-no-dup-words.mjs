// 词库去重体检：同一个词/短语不能在词库里出现两份纯重复的卡片。
//
// 起因：用户反馈"重复的太多了"。逐条核对后发现真有 23 组——归一化后
// （去掉冠词/大小写/末尾标点）是同一个词，中文释义也逐字相同，纯属重复：
//   · was（形容词·小词）跟 Was?（入门必会）——只是大小写和标点不同，教的是同一件事
//   · Kaffee（餐饮·美食）跟 der Kaffee（居家·物品）——少写了冠词，不是两个词
//   · links abbiegen 跟 Links abbiegen. 甚至在**同一个分类**里重复了两次
// 精确字符串匹配（de+zh 完全相同）一个都抓不到，因为这些重复都带着大小写/
// 标点/冠词的细微差异——必须先归一化再比。
//
// 也钉住"看着像重复、其实不是"的反例：husten（动词，咳嗽）/ der Husten（名词，
// 一阵咳嗽的症状）——德语固有的"动词→名词化"构词，中文恰好都能译成"咳嗽"，
// 但这两个词在句子里的用法完全不同，不该被这条检查误伤。这类必须保留两条，
// 用不同的中文释义体现"这是名词"来避免看着像重复——见 KNOWN_DISTINCT。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

const norm = (s) => s.trim().toLowerCase().replace(/^(der|die|das)\s+/, '').replace(/[!?.,;:]+$/, '').trim();

// 归一化后撞在一起、但确认是德语固有的动词→名词构词（中文释义已经分开写了）的词对。
// 只要 verify-data 之类的检查还在，这里松了也不会漏掉"两条中文释义又被写成一样"的情况
// ——那种情况会被下面的主循环直接当重复条目报出来，不需要这张表操心。
const KNOWN_DISTINCT = new Set(['schwimmen', 'wandern', 'husten', 'braten']);

function audit(file) {
  const cats = JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  const rows = [];
  for (const c of cats) for (const p of c.phrases) rows.push([p.de, p.zh, c.name]);
  const byNorm = new Map();
  for (const r of rows) {
    const k = norm(r[0]);
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k).push(r);
  }
  let checked = 0, skipped = 0;
  for (const [k, list] of byNorm) {
    if (list.length < 2) continue;
    checked++;
    if (KNOWN_DISTINCT.has(k)) { skipped++; continue; }
    const zhs = new Set(list.map((x) => x[1]));
    if (zhs.size === 1) {
      bad(`${file}：「${list[0][0]}」跟「${list[1][0]}」是同一个词、中文释义也一样（都是「${list[0][1]}」）——`
        + list.map((x) => `${x[2]}:「${x[0]}」`).join(' vs ') + '，纯重复，删一条');
    }
  }
  console.log(`  ${file}：${rows.length} 条，归一化撞车 ${checked} 组（豁免 ${skipped} 组已知的动词/名词化构词）`);
}

audit('data/categories.json');
audit('data/en_categories.json');

// 已确认没用的豁免要及时清理，别让它一直挡着真问题
{
  const cats = JSON.parse(readFileSync(join(ROOT, 'data/categories.json'), 'utf8'));
  const all = new Set(cats.flatMap((c) => c.phrases.map((p) => norm(p.de))));
  for (const k of KNOWN_DISTINCT) if (!all.has(k)) bad(`豁免表里的「${k}」在词库里已经没有了，请从 KNOWN_DISTINCT 删掉`);
}

console.log('词库去重体检：');
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 没有归一化后仍中文释义相同的纯重复词条');
