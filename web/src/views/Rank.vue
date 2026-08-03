<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
const rows = ref([]); const loading = ref(true); const err = ref('');
onMounted(async () => {
  const r = await api.rank(); loading.value = false;
  if (r.ok) rows.value = r.data.list || r.data.rows || [];
  else err.value = r.offline ? '离线中，联网后重试' : (r.data.err || '加载失败');
});
</script>
<template>
  <div class="page">
    <h1 class="page-title">排行榜</h1>
    <p class="page-sub">按掌握词数排名</p>
    <p v-if="loading" class="page-sub">加载中…</p>
    <p v-else-if="err" class="page-sub">{{ err }}</p>
    <div v-for="(u, i) in rows" :key="i" class="item rk">
      <span class="no" :class="{ top: i < 3 }">{{ i + 1 }}</span>
      <span class="nm">{{ u.nickname || u.username }}</span>
      <span class="kn">{{ u.known || 0 }} 词</span>
    </div>
  </div>
</template>
<style scoped>
.rk{display:flex;align-items:center;gap:14px}
.no{width:26px;text-align:center;color:var(--text-3);font-size:14px;font-variant-numeric:tabular-nums}
.no.top{color:var(--brand-text);font-weight:700}
.nm{flex:1;font-size:16px}
.kn{color:var(--text-3);font-size:13px;font-variant-numeric:tabular-nums}
</style>
