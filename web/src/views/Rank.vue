<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
const rows = ref([]); const loading = ref(true); const err = ref('');
onMounted(async () => {
  const r = await api.rank();
  loading.value = false;
  if (r.ok) rows.value = r.data.list || r.data.rows || [];
  else err.value = r.offline ? '离线中，联网后重试' : (r.data.err || '加载失败');
});
</script>
<template>
  <div class="wrap">
    <van-nav-bar title="排行榜" />
    <van-loading v-if="loading" class="ld">加载中…</van-loading>
    <van-empty v-else-if="err" :description="err" />
    <van-cell v-for="(u,i) in rows" :key="i" :title="u.nickname || u.username"
      :label="`掌握 ${u.known||0} 词 · 连续 ${u.streak||0} 天`">
      <template #icon><span class="no">{{ i+1 }}</span></template>
    </van-cell>
  </div>
</template>
<style scoped>
.wrap{padding-bottom:70px}.ld{padding:40px;text-align:center}
.no{width:28px;text-align:center;color:var(--gold-text);font-weight:700}
</style>
