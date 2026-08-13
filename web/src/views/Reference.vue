<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { loadData } from '../api';
import { useLang } from '../store/lang';
import { speak } from '../api/speak';
import { studyTick } from '../api/study';
defineOptions({ name: 'Reference' });

const route = useRoute();
const langS = useLang();
const data = ref(null);
const letters = ref([]);
const numbers = ref(null);
const quizzes = ref(null);
const TITLES = { pron: ['发音', '字母与读音规则'], numbers: ['数字', '从 0 到大数'], grammar: ['语法', '核心规则速查'] };
const key = computed(() => route.params.topic);
const meta = computed(() => TITLES[key.value] || ['参考', '']);

onMounted(async () => {
  data.value = await loadData('reference');
  // 字母表 / 数字卡在旧站是 JS 现渲染的（renderLetterGrid / renderNumGrid），
  // 不在抽出来的静态 HTML 里 —— 不单独补上，发音页会少 30 张字母卡、数字页少 13 张 0–12 卡，
  // 而这两组正是这两页的主体内容。
  [letters.value, numbers.value, quizzes.value] = await Promise.all(
    [loadData('letters'), loadData('numbers'), loadData('quizzes')]);
});

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 卡片标记与旧站逐字一致，只把 onclick 换成 data-say —— v-html 不执行内联事件，
// 朗读改由容器上的一个委托监听处理（见 onSpeak）。
const letterCards = () => letters.value.map((x) =>
  `<div class="letter-card${x.sp ? ' special' : ''}"><div class="lc-letter">${esc(x.l)}</div>`
  + `<div class="lc-name">名称：<b>${esc(x.name)}</b></div><div class="lc-sound">${x.sound}</div>`
  + `<button class="speak-btn" type="button" title="朗读字母" aria-label="朗读字母 ${esc(x.l)}" data-say="${esc(x.say)}">🔊</button></div>`).join('');
const numCards = (list) => list.map((x) =>
  `<div class="num-card"><div class="num-big">${esc(x.n)}</div>`
  + `<div class="num-de" lang="de">${esc(x.de)}</div><div class="num-py">${esc(x.py)}</div>`
  + `<button class="speak-btn" type="button" title="朗读" aria-label="朗读 ${esc(x.de)}" data-say="${esc(x.de)}">🔊</button></div>`).join('');

// 「即学即练」：页面里只有 <div class="gq-box" data-gq="p1"> 空壳，题目在 quizzes.json。
// 不填的话发音页/语法页的 5 个小测全是空的 —— 旧站是 renderGqBox 在运行时填的。
const shuffle = (n) => { const a = [...Array(n).keys()];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a; };
function quizHtml(poolKey) {
  const pool = (quizzes.value || {})[poolKey];
  if (!pool || !pool.length) return '';
  const qs = shuffle(pool.length).slice(0, 3).map((i) => pool[i]);
  let h = `<div class="gq-head">✏️ 即学即练</div><div class="gq-sub">从 ${pool.length} 题里随机抽 3 题——答错也没关系，看一眼解释就懂了</div>`;
  qs.forEach((q, qi) => {
    h += `<div class="gq-item"><div class="gq-q">${qi + 1}. ${esc(q.q)}</div><div class="gq-opts">`
      + q.o.map((o, oi) => `<button type="button" class="gq-opt" data-a="${q.a}" data-i="${oi}">${esc(o)}</button>`).join('')
      + `</div><div class="gq-why">💡 ${esc(q.w)}</div></div>`;
  });
  return h + '<div class="gq-score"></div>';
}

// 内容是本仓库自己的静态 HTML（构建期由 tools/gen-web-data.mjs 从 src.html 抽取），无用户输入，v-html 安全
const html = computed(() => {
  let h = data.value?.[key.value]?.[langS.lang] || '';
  if (!h) return '';
  if (letters.value.length) h = h.replace('<div class="letter-grid"></div>', `<div class="letter-grid">${letterCards()}</div>`);
  if (numbers.value) {
    // 德语页两组（0–12 / 大数），英语页四组（1–12 / 13–19 / 整十 / 序数词）——
    // 按当前语言取对应那批，逐个占位坑一一对应。之前笼统地「第一个 small、其余 big」，
    // 结果英语数字页铺的全是德语数字（null / eins / zwei…）。
    const groups = numbers.value[langS.lang] || numbers.value.de || [];
    let i = 0;
    h = h.replace(/<div class="num-grid"><\/div>/g,
      () => `<div class="num-grid">${numCards(groups[i++] || [])}</div>`);
  }
  if (quizzes.value) {
    h = h.replace(/<div class="gq-box" data-gq="([^"]+)"><\/div>/g,
      (m, k) => `<div class="gq-box" data-gq="${k}">${quizHtml(k)}</div>`);
  }
  return h;
});

// 事件委托：v-html 里的按钮没有 Vue 绑定，统一在容器上接
function onRefClick(e) {
  const sb = e.target.closest('.speak-btn[data-say]');
  if (sb) { e.stopPropagation(); speak(sb.getAttribute('data-say'), langS.isEn ? 'en-US' : 'de-DE'); return; }
  const opt = e.target.closest('.gq-opt');
  if (opt) return gqPick(opt);
  const again = e.target.closest('.gq-again');
  if (again) {
    const box = again.closest('.gq-box');
    box.innerHTML = quizHtml(box.getAttribute('data-gq'));
  }
}
// 判题逻辑与旧站 gqPick 一致：亮出正解、标错、答完出成绩
function gqPick(btn) {
  const item = btn.closest('.gq-item');
  if (!item || item.classList.contains('done')) return;
  item.classList.add('done');
  const a = +btn.getAttribute('data-a'), oi = +btn.getAttribute('data-i');
  const opts = item.querySelectorAll('.gq-opt');
  opts[a].classList.add('ok');
  if (oi !== a) btn.classList.add('bad');
  item.setAttribute('data-right', oi === a ? '1' : '0');
  try { studyTick(1, true); } catch { /* 计入今日目标，失败不影响答题 */ }
  const box = item.closest('.gq-box');
  const all = box.querySelectorAll('.gq-item');
  if (box.querySelectorAll('.gq-item.done').length !== all.length) return;
  const r = box.querySelectorAll('.gq-item[data-right="1"]').length;
  const sc = box.querySelector('.gq-score');
  sc.style.display = 'block';
  sc.innerHTML = (r === all.length ? '🎉 全对！这组你已经掌握了' : `✅ 答对 ${r}/${all.length} · 错的看上面绿色解释，马上就懂`)
    + '<button class="btn gq-again" type="button">🔄 换一组再练</button>';
}
// 回到顶部已由 router 的 scrollBehavior 统一处理，这里不再重复
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ meta[0] }}</h1>
    <p class="page-sub">{{ meta[1] }}</p>
    <p v-if="!data" class="page-sub">加载中…</p>
    <div v-else class="ref" v-html="html" @click="onRefClick"></div>
  </div>
</template>

<style scoped>
/* 抽取的内容沿用旧站变量名，这里做别名映射 —— 关键是把当文字用的 --gold
   映射到 --brand-text 而非品牌绿本身：后者在浅色底上只有 2.1:1，做文字不合格。 */
.ref{
  --gold:var(--brand-text); --gold-dim:var(--brand-text); --gold-faint:var(--tip-bg);
  --text-dim:var(--text-2); --text-faint:var(--text-3); --border:var(--line);
  --blue:var(--info-text); --shadow:none;
  --danger-text:#c92a2e; --info-text:#0b6bcb; --warn-text:#8a5200;
  --tint-danger:#fff0f0; --tint-info:#eef6ff; --tint-brand:#f1fbe9; --tint-warn:#fff7e6;
}
/* 深色底要提亮，否则同样的色压在深底上不达标。
   必须写在组件 scoped 内 —— 写全局会被 scoped 的 .ref 规则以更高特异性盖掉。 */
:root[data-theme=dark] .ref{--danger-text:#ff9a9d;--info-text:#8fcdff;--warn-text:#f5cf70;
  --tint-danger:#2a1416;--tint-info:#0e1e2b;--tint-brand:#14210a;--tint-warn:#2a2210}
@media (prefers-color-scheme:dark){
  :root:not([data-theme=light]) .ref{--danger-text:#ff9a9d;--info-text:#8fcdff;--warn-text:#f5cf70;
    --tint-danger:#2a1416;--tint-info:#0e1e2b;--tint-brand:#14210a;--tint-warn:#2a2210}
}
/* 内容沿用旧站的类名，这里重新配色配版，使其与新设计语言一致 —— 内容零改动，只换观感 */
.ref :deep(.sec-title){display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;
  color:var(--text-3);letter-spacing:.06em;margin:30px 0 10px;padding:0}
.ref :deep(.sec-title:first-child){margin-top:6px}
.ref :deep(.sec-title-icon){font-size:16px}
.ref :deep(.sec-title-count){display:none}
.ref :deep(p){font-size:15px;color:var(--text-2);line-height:1.85;margin:0 0 12px}
.ref :deep(b),.ref :deep(strong){color:var(--text)}
.ref :deep(ul),.ref :deep(ol){padding-left:20px;margin:0 0 12px}
.ref :deep(li){font-size:15px;color:var(--text-2);line-height:1.85;margin-bottom:6px}
/* 规则框：去掉旧的重底色，改一条左边线 */
.ref :deep(.rule-box){border:none;border-left:3px solid var(--brand);background:transparent;
  padding:2px 0 2px 14px;margin:0 0 16px;border-radius:0}
.ref :deep(.tip-box){background:var(--tip-bg);color:var(--tip-text);border:none;
  border-radius:12px;padding:12px 14px;margin:0 0 16px;font-size:14px;line-height:1.8}
/* 表格：横向可滚，不撑破页面 */
.ref :deep(table){width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;display:block;overflow-x:auto}
.ref :deep(th),.ref :deep(td){border:1px solid var(--line);padding:8px 10px;text-align:left;white-space:nowrap}
.ref :deep(th){background:var(--surface);font-weight:600;color:var(--text)}
.ref :deep(td){color:var(--text-2)}
/* <small> 默认 0.83em 会掉到 11.67px，低于本项目「辅助文字 ≥12px」的规定 */
.ref :deep(small){font-size:12px;color:var(--text-3)}
.ref :deep(code){background:var(--line);padding:1px 5px;border-radius:4px;font-size:13px}
/* 参考页的正文是旧站传过来的 HTML 字符串，控制不到每个元素，
   所以在容器上兜底：任何子元素都不得超过容器宽度。
   不加这一条，语法页的输入框（固定 170px）和拼读胶囊行会把整个文档撑宽。
   min-width:0 是配套的：grid 的 1fr 实为 minmax(auto,1fr)，flex 子项默认 min-width:auto，
   两者都意味着「装不下也不缩」。语法页有个数据里写死的 repeat(3,1fr) 三列表格，
   正是靠这一条才肯在窄屏收窄。 */
.ref :deep(*){max-width:100%;min-width:0}
/* 语法页那个动词输入框在数据里带着行内 style="min-width:170px"。
   min-width 优先于 max-width，所以上面那条 max-width:100% 对它无效，
   窄屏下它一个人就把文档撑到 255px。行内样式只能用 !important 压。 */
.ref :deep(input),.ref :deep(select){box-sizing:border-box;min-width:0!important;width:100%}
.ref :deep(.ph-row){display:flex;flex-wrap:wrap;gap:3px}
/* 旧站的字母卡/数字卡：改成自适应网格 */
.ref :deep(.letter-grid),.ref :deep(.num-grid){display:grid;
  grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin:0 0 16px}
.ref :deep(.letter-card),.ref :deep(.num-card){border:1px solid var(--line);border-radius:12px;
  padding:10px;text-align:center;background:var(--surface)}

/* ── 内嵌小测「即学即练」：旧站的类名，这里补样式（之前 v-html 填进来但没配色，
      选项按钮拿的是继承色，实测 1.05:1，几乎看不见） ── */
.ref :deep(.gq-box){border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0 0 18px;
  background:var(--surface)}
.ref :deep(.gq-head){font-size:14px;font-weight:700;color:var(--brand-text);margin-bottom:2px}
.ref :deep(.gq-sub){font-size:12px;color:var(--text-3);margin-bottom:10px}
.ref :deep(.gq-item){margin-bottom:14px}
.ref :deep(.gq-item:last-of-type){margin-bottom:4px}
.ref :deep(.gq-q){font-size:14px;color:var(--text);line-height:1.7;margin-bottom:8px}
.ref :deep(.gq-opts){display:flex;flex-wrap:wrap;gap:8px}
.ref :deep(.gq-opt){position:relative;min-height:44px;min-width:44px;padding:8px 14px;border-radius:12px;
  border:1px solid var(--line);background:var(--surface-2);color:var(--text);
  font-size:14px;font-family:inherit;cursor:pointer;max-width:100%}
.ref :deep(.gq-opt.ok){background:var(--tip-bg);border-color:var(--brand);color:var(--brand-text);font-weight:700}
.ref :deep(.gq-opt.bad){background:var(--tint-danger);border-color:var(--danger-text);color:var(--danger-text)}
/* 解释默认藏起来，答完这题才露出——先想再看答案 */
.ref :deep(.gq-why){display:none;margin-top:8px;padding:8px 12px;border-radius:10px;
  background:var(--tip-bg);color:var(--tip-text);font-size:13px;line-height:1.75}
.ref :deep(.gq-item.done .gq-why){display:block}
.ref :deep(.gq-score){display:none;margin-top:10px;font-size:14px;color:var(--text);font-weight:600}
.ref :deep(.gq-score .btn){display:block;margin-top:10px}
.ref :deep(.btn){position:relative;min-height:44px;padding:10px 20px;border-radius:22px;
  border:1px solid var(--gold-dim);background:var(--btn-bg);color:var(--brand-text);
  font-size:14px;font-weight:600;font-family:inherit;cursor:pointer}
/* 字母卡/数字卡上的朗读键：视觉 30px，热区撑到 44px（旧站同款做法） */
.ref :deep(.speak-btn){position:relative;width:30px;height:30px;border:none;border-radius:50%;
  background:var(--tip-bg);color:var(--brand-text);font-size:15px;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;line-height:1;padding:0;
  margin-top:6px;font-family:inherit}
.ref :deep(.speak-btn)::after{content:"";position:absolute;left:50%;top:50%;
  transform:translate(-50%,-50%);width:44px;height:44px}
.ref :deep(.lc-letter){font-size:22px;font-weight:700;color:var(--brand-text)}
.ref :deep(.lc-name){font-size:12px;color:var(--text-2);margin-top:4px}
.ref :deep(.lc-sound){font-size:12px;color:var(--text-2);line-height:1.6;margin-top:4px}
.ref :deep(.num-big){font-size:26px;font-weight:700;color:var(--brand-text)}
.ref :deep(.num-de){font-size:14px;color:var(--text);margin-top:2px}
.ref :deep(.num-py){font-size:12px;color:var(--text-2);margin-top:2px}
</style>
