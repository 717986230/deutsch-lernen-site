<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
const router = useRouter();
const list = ref([]); const err = ref(''); const loading = ref(true);
onMounted(async () => {
  const r = await api.following(); loading.value = false;
  if (r.ok) list.value = r.data.list || [];
  else err.value = r.offline ? '离线中，联网后重试' : (r.data.err || '加载失败');
});
</script>
<template>
  <div class="page">
    <div class="bar"><button class="back tap" @click="router.back()">‹ 返回</button></div>
    <h1 class="page-title">我关注的人</h1>
    <p v-if="loading" class="page-sub">加载中…</p>
    <p v-else-if="err" class="page-sub">{{ err }}</p>
    <p v-else-if="!list.length" class="page-sub">还没关注任何人。去排行榜点头像看看别人的主页 👀</p>
    <div v-for="(u, i) in list" :key="i" class="item fw" @click="router.push('/u/' + u.username)">
      <span class="av" :style="{background: u.av_bg || 'var(--brand)'}">{{ u.avatar || '🦊' }}</span>
      <span class="tx"><span class="nm">{{ u.nickname || u.username }}</span>
        <span class="ds">{{ u.level || 'A1' }} · 🏅{{ u.badges || 0 }}</span></span>
      <span class="kn">{{ u.known || 0 }} 词</span>
    </div>
  </div>
</template>
<style scoped>
.bar{padding:12px 0 4px}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;font-family:inherit;cursor:pointer;padding:4px 0}
.fw{display:flex;align-items:center;gap:11px}
.av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}
.tx{flex:1;display:flex;flex-direction:column}
.nm{font-size:15px;font-weight:600}
.ds{font-size:12px;color:var(--text-3);margin-top:2px}
.kn{font-size:13px;color:var(--text-3);font-variant-numeric:tabular-nums}
</style>
