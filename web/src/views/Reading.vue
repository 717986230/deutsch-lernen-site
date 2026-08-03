<script setup>
import { ref, computed, onMounted } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
defineOptions({ name: 'Reading' });
const list = ref([]); const loading = ref(true); const cur = ref(null);
const LV = { '0': '入门', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2' };
onMounted(async () => { list.value = await loadData('readings'); loading.value = false; });
// 餐厅专题单列，不混进分级列表（与旧站规则一致）
const grouped = computed(() => {
  const g = {};
  for (const r of list.value) {
    const k = r.topic === 'restaurant' ? '餐厅' : (LV[String(r.level)] || r.level);
    (g[k] ||= []).push(r);
  }
  return Object.entries(g);
});
</script>
<template>
  <div class="page">
    <template v-if="!cur">
      <h1 class="page-title">短文</h1>
      <p class="page-sub">分级阅读 · 逐句对照</p>
      <div class="jump">
        <button class="seg" @click="$router.push('/dialog')">情景对话</button>
        <button class="seg" @click="$router.push('/series')">留学连载</button>
      </div>
      <p v-if="loading" class="page-sub">加载中…</p>
      <template v-for="[lv, arr] in grouped" :key="lv">
        <div class="group">{{ lv }}</div>
        <div v-for="(r, i) in arr" :key="i" class="item" @click="cur = r">
          <div class="ti">{{ r.title }}</div>
          <div class="item-zh">{{ r.zh }}</div>
        </div>
      </template>
    </template>

    <template v-else>
      <div class="bar"><button class="back tap" @click="cur = null">‹ 返回</button></div>
      <h2 class="at">{{ cur.title }}</h2>
      <p class="az">{{ cur.zh }}</p>
      <!-- readings 三元素带谐音，series 两元素没有 —— p[2] 存在与否决定显示 -->
      <div v-for="(p, i) in cur.paras" :key="i" class="item" @click="speak(p[0])">
        <div class="item-de" lang="de">{{ p[0] }}</div>
        <div class="item-zh">{{ p[1] }}</div>
        <div v-if="p[2]" class="item-py">{{ p[2] }}</div>
      </div>
    </template>
  </div>
</template>
<style scoped>
.jump{display:flex;gap:6px;margin:0 0 18px}
.ti{font-size:17px;font-weight:600}
.bar{padding:12px 0 4px;position:sticky;top:0;background:var(--bg);z-index:2}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;font-family:inherit;cursor:pointer;padding:4px 0}
.at{font-size:22px;font-weight:700;margin:8px 0 2px;letter-spacing:-.02em}
.az{color:var(--text-3);font-size:14px;margin:0 0 12px}
</style>
