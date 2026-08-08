<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { loadData } from '../api';
import { useLang } from '../store/lang';
defineOptions({ name: 'Reference' });

const route = useRoute();
const langS = useLang();
const data = ref(null);
const TITLES = { pron: ['发音', '字母与读音规则'], numbers: ['数字', '从 0 到大数'], grammar: ['语法', '核心规则速查'] };
const key = computed(() => route.params.topic);
const meta = computed(() => TITLES[key.value] || ['参考', '']);

onMounted(async () => { data.value = await loadData('reference'); });
// 内容是本仓库自己的静态 HTML（构建期从 src.html 抽取），无用户输入，v-html 安全
const html = computed(() => data.value?.[key.value]?.[langS.lang] || '');
// 切页时回到顶部，否则从长页面切过去会停在半空
watch(key, () => scrollTo(0, 0));
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ meta[0] }}</h1>
    <p class="page-sub">{{ meta[1] }}</p>
    <LangSwitch />
    <p v-if="!data" class="page-sub">加载中…</p>
    <div v-else class="ref" v-html="html"></div>
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
/* 旧站的字母卡/数字卡：改成自适应网格 */
.ref :deep(.letter-grid),.ref :deep(.num-grid){display:grid;
  grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin:0 0 16px}
.ref :deep(.letter-card),.ref :deep(.num-card){border:1px solid var(--line);border-radius:12px;
  padding:10px;text-align:center;background:var(--surface)}
</style>
