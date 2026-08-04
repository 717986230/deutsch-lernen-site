<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
defineOptions({ name: 'Feed' });
const router = useRouter();
const list = ref([]); const err = ref(''); const loading = ref(true);
onMounted(async () => {
  const r = await api.feed(); loading.value = false;
  if (r.ok) list.value = r.data.list || [];
  else err.value = r.offline ? '离线中，联网后重试' : (r.data.err || '加载失败');
});
// 动态是系统生成的（点亮徽章 / 打卡破纪录），没有 UGC —— 这是产品红线，不接受用户投稿
const text = (a) => a.type === 'badge' ? '点亮了徽章' : a.type === 'streak' ? `连续打卡 ${a.data} 天，破了纪录` : '有新进展';
const ago = (ts) => { const m = (Date.now() - ts) / 6e4;
  return m < 60 ? Math.max(1, m | 0) + ' 分钟前' : m < 1440 ? (m / 60 | 0) + ' 小时前' : (m / 1440 | 0) + ' 天前'; };
</script>
<template>
  <div class="page">
    <h1 class="page-title">动态</h1>
    <p class="page-sub">你和关注的人的学习进展</p>
    <p v-if="loading" class="page-sub">加载中…</p>
    <p v-else-if="err" class="page-sub">{{ err }}</p>
    <p v-else-if="!list.length" class="page-sub">还没有动态。去关注几个人，或者自己先拿一枚徽章 🏅</p>
    <div v-for="(a, i) in list" :key="i" class="item fd" @click="router.push('/u/' + a.username)">
      <span class="av" :style="{background: a.av_bg || 'var(--brand)'}">{{ a.avatar || '🦊' }}</span>
      <span class="tx">
        <span class="nm">{{ a.nickname || a.username }}</span>
        <span class="ds">{{ text(a) }}</span>
      </span>
      <span class="tm">{{ ago(a.ts) }}</span>
    </div>
  </div>
</template>
<style scoped>
.fd{display:flex;align-items:center;gap:11px}
.av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:20px;flex:none}
.tx{flex:1;display:flex;flex-direction:column;min-width:0}
.nm{font-size:15px;font-weight:600}
.ds{font-size:13px;color:var(--text-2);margin-top:2px}
.tm{font-size:12px;color:var(--text-3);white-space:nowrap}
</style>
