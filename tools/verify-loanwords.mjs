// 英语外来词的「德语说法」体检。
//
// 起因：手册里混着一堆英语借词 —— der Job / das Handy / die Deadline，
// 菜单上更是整片英文（Fried Rice、Chicken Bowl、Cheesecake）。
// 学员照着念完，德国人嘴里的 die Arbeit / das Mobiltelefon / der gebratene Reis
// 反而听不懂。所以给这些词条加了 syn 字段（卡片上「德语说法」那一行）。
//
// 这里钉三件事：
//   A. 凡是含已知英语词的词条，必须有 syn —— 以后再往菜单里加 "Chicken Curry"
//      而忘了标德语说法，构建就红
//   B. syn 本身必须是德语：不许再出现英语词（"der Laptop-Computer" 这种糊弄写法）
//   C. 同一个词条在全站只能有一种 syn；名词的冠词要跟 de 保持同一套写法
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const bad = (m) => { console.error('ERROR ' + m); fail++; };

// 已在词库里出现、并且已经给出德语说法的英语词。
// 只列「确实标注了的」——Laptop / Browser / Podcast 这些德语本身没有通行本土词，
// 硬造一个（Klapprechner）是误人子弟，所以不收进来，也就不要求标注。
const EN = new Set(`
job handy computer smartphone team meeting deadline account cloud backup app link
website webseite story hashtag follower influencer streaming e-book e-mail internet
baby hobby party test ticket outfit check-in shampoo stress club design fan star
poster band training workshop interview foul babysitter fitnessstudio couch penthouse
trendy online basketball hey okay fake pink quantencomputer
recyceln scannen downloaden uploaden chatten joggen surfen
chicken beef shrimp shrimps duck salmon tuna prawns king dumplings vegetables veggie
soup rice roll bowl set mix fried boiled crispy crunchy spicy sweet red green pink
rainbow dragon korean power cheesecake summerrolls springroll mini hot pot cocos
`.trim().split(/\s+/));

// 品牌名不翻译：Red Bull 就是 Red Bull，德语里没有别的叫法
const BRAND = new Set(['Red Bull']);

const tok = (s) => s.toLowerCase().split(/[\s/]+/).map((w) => w.replace(/^[^a-zäöüß-]+|[^a-zäöüß-]+$/g, '')).filter(Boolean);

const cats = JSON.parse(readFileSync(join(ROOT, 'data/categories.json'), 'utf8'));
const synOf = new Map();
let tagged = 0, scanned = 0;

for (const c of cats) {
  for (const p of c.phrases) {
    scanned++;
    if (BRAND.has(p.de.trim())) continue;      // 品牌名跳过
    const en = tok(p.de).filter((w) => EN.has(w));
    // ── A. 含英语词就必须有德语说法 ──
    if (en.length && !p.syn) {
      bad(`[${c.name}]「${p.de}」含英语词 ${en.join('/')}，却没标德语说法（syn）`);
      continue;
    }
    if (!p.syn) continue;
    tagged++;
    if (!en.length) bad(`[${c.name}]「${p.de}」标了德语说法，但它并不含英语词 —— syn 是给外来词用的`);

    // ── B. syn 必须是德语 ──
    const back = tok(p.syn).filter((w) => EN.has(w));
    if (back.length) bad(`[${c.name}]「${p.de}」的德语说法「${p.syn}」里还留着英语词 ${back.join('/')}`);
    if (!/^[A-Za-zÄÖÜäöüß]/.test(p.syn)) bad(`[${c.name}]「${p.de}」的德语说法不是以德语词开头：${p.syn}`);
    if (/[^A-Za-zÄÖÜäöüß\s/,.!?()（）「」＝=-]/.test(p.syn.replace(/[一-鿿]/g, ''))) {
      bad(`[${c.name}]「${p.de}」的德语说法含可疑字符：${p.syn}`);
    }
    if (p.syn.trim() === p.de.trim()) bad(`[${c.name}]「${p.de}」的德语说法跟原词一模一样`);

    // ── C. 同词一种说法 + 冠词同步 ──
    const prev = synOf.get(p.de.trim());
    if (prev && prev !== p.syn) bad(`「${p.de}」有两种德语说法：${prev} / ${p.syn}`);
    synOf.set(p.de.trim(), p.syn);
    const art = (p.de.match(/^(der|die|das)\s/) || [])[1];
    if (art && !/^(der|die|das)\s/.test(p.syn)) {
      bad(`[${c.name}]「${p.de}」是名词（${art}），德语说法也要带冠词：${p.syn}`);
    }
  }
}

// 白名单失效（词条被删/改名）时要提醒清理，否则它会一直挡着真问题
const all = new Set(cats.flatMap((c) => c.phrases.map((p) => p.de.trim())));
for (const b of BRAND) if (!all.has(b)) bad(`白名单里的品牌「${b}」已经不在词库里了，请从 BRAND 删掉`);

// 词条被误删时要立刻发现：标注规模不该悄悄缩水
if (tagged < 110) bad(`只剩 ${tagged} 条带德语说法，之前是 128 条 —— 是不是被覆盖掉了？`);

console.log(`外来词德语说法体检：扫 ${scanned} 条词条，${tagged} 条带德语说法，英语词表 ${EN.size} 个`);
if (fail) { console.error(`\n共 ${fail} 处问题`); process.exit(1); }
console.log('OK 英语外来词全部标了德语说法，说法本身没夹带英语');
