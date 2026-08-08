<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { useLang } from '../store/lang';
import { getKnown, markKnown, unmarkKnown, touchStudy } from '../api/practice';
defineOptions({ name: 'Phrases' });

const langS = useLang();
const cats = ref([]); const loading = ref(true); const cur = ref(null);
// 翻面状态按句子文本记，切分类不残留
const flipped = ref({});
// 已学会集合复制一份进 ref，才能驱动重渲染（localStorage 本身不是响应式的）
const known = ref(getKnown());
function toggleKnown(de) {
  if (known.value[de]) { unmarkKnown(de); } else { markKnown(de); touchStudy(); }
  known.value = { ...getKnown() };
}
async function load() {
  loading.value = true; cur.value = null; flipped.value = {};
  cats.value = await loadData(langS.file('categories'));
  known.value = { ...getKnown() };
  loading.value = false;
}
onMounted(load);
watch(() => langS.lang, load);
// 按等级分组展示分类，避免一次抛出 20 个并列项
const LV = { '0': '入门', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2' };
const grouped = computed(() => {
  const g = {};
  for (const c of cats.value) (g[String(c.level)] ||= []).push(c);
  return Object.entries(g).sort();
});
</script>
<template>
  <div class="page">
    <!-- 列表页：只让人选一件事 —— 学哪一类 -->
    <template v-if="!cur">
      <h1 class="page-title">短语</h1>
      <p class="page-sub">按主题分类 · 点句子听发音</p>
      <p v-if="loading" class="page-sub">加载中…</p>
      <template v-for="[lv, list] in grouped" :key="lv">
        <div class="group">{{ LV[lv] || lv }}</div>
        <div v-for="c in list" :key="c.name" class="item cat" @click="cur = c">
          <span class="icon">{{ c.icon }}</span>
          <span class="nm">{{ c.name }}</span>
          <span class="ct">{{ c.phrases.length }}</span>
        </div>
      </template>
    </template>

    <!-- 详情页：屏幕上只剩句子，没有任何其他控件争夺注意力 -->
    <template v-else>
      <div class="bar">
        <button class="back tap" @click="cur = null">‹ 返回</button>
        <span class="bt">{{ cur.icon }} {{ cur.name }}</span>
      </div>
      <!-- 与旧站同构：🔊 朗读 / 句子 / ✓ 已学会；点卡片翻开谐音 -->
      <div v-for="(p, i) in cur.phrases" :key="i" class="item"
        :class="{ flipped: flipped[p.de] }" @click="flipped[p.de] = !flipped[p.de]">
        <div class="item-de-row">
          <button class="icon-btn" type="button" :aria-label="'朗读 ' + p.de"
            @click.stop="speak(p.de, langS.isEn ? 'en-US' : 'de-DE')">🔊</button>
          <div class="item-de" lang="de">{{ p.de }}</div>
          <button class="icon-btn know" type="button" :class="{ off: !known[p.de] }"
            :aria-label="known[p.de] ? '取消已学会' : '标记为已学会'"
            :title="known[p.de] ? '已学会（点击取消）' : '标记为已学会'"
            @click.stop="toggleKnown(p.de)">✓</button>
        </div>
        <div class="item-zh">{{ p.zh }}</div>
        <div class="item-py">{{ p.py }}</div>
      </div>
    </template>
  </div>
</template>
<style scoped>
.cat{display:flex;align-items:center;gap:12px;font-size:16px}
.icon{font-size:20px}.nm{flex:1;font-weight:500}
.ct{color:var(--text-3);font-size:13px}
.bar{display:flex;align-items:center;gap:10px;padding:12px 0 4px;
  position:sticky;top:0;background:var(--bg);z-index:2}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;
  font-family:inherit;cursor:pointer;padding:4px 0}
.bt{font-weight:600}
.item-de{flex:1}
.know.off{opacity:.55}
</style>
