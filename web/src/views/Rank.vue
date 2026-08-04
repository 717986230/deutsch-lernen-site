<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '../api';
const BY = [['known', '词汇'], ['streak', '连续'], ['total', '总量']];
const by = ref('known'); const rows = ref([]); const loading = ref(true); const err = ref('');
// 只完整显示前十，其余折叠 —— 榜单一屏放不下 50 条，前十才是用户真正关心的
const TOP = 10;
const expanded = ref(false);
const shown = computed(() => expanded.value ? rows.value : rows.value.slice(0, TOP));
const restCount = computed(() => Math.max(0, rows.value.length - TOP));
async function load() {
  loading.value = true; err.value = '';
  const r = await api.leaderboard(by.value);
  loading.value = false;
  if (r.ok) { rows.value = r.data.list || []; expanded.value = false; }
  // 网络故障与业务失败要分开说，别都归成「加载失败」
  else err.value = r.offline ? '离线中，联网后重试' : (r.data.err || '加载失败');
}
onMounted(load); watch(by, load);
const val = (u) => by.value === 'known' ? `${u.known || 0} 词`
  : by.value === 'streak' ? `${u.streak || 0} 天` : `${u.total || 0} 次`;
</script>
<template>
  <div class="page">
    <h1 class="page-title">排行榜</h1>
    <div class="segs">
      <button v-for="[v, t] in BY" :key="v" class="seg" :class="{ on: by === v }"
        @click="by = v">{{ t }}</button>
    </div>
    <p v-if="loading" class="page-sub">加载中…</p>
    <p v-else-if="err" class="page-sub">{{ err }}</p>
    <p v-else-if="!rows.length" class="page-sub">还没有人上榜，快去学习吧</p>
    <div v-for="(u, i) in shown" :key="i" class="item rk">
      <span class="no" :class="{ top: i < 3 }">{{ ['🥇','🥈','🥉'][i] || i + 1 }}</span>
      <span class="av" :style="{ background: u.av_bg || 'var(--line)' }">{{ u.avatar || '🦊' }}</span>
      <span class="nm">{{ u.nickname || u.username }}</span>
      <span class="kn">{{ val(u) }}</span>
    </div>
    <button v-if="!expanded && restCount" class="btn btn-plain more" @click="expanded = true">
      展开其余 {{ restCount }} 名</button>
    <button v-else-if="expanded && restCount" class="btn btn-plain more" @click="expanded = false">
      只看前 {{ TOP }} 名</button>
  </div>
</template>
<style scoped>
.more{margin-top:14px;font-size:14px}
.segs{margin:4px 0 8px}
.rk{display:flex;align-items:center;gap:12px}
.no{width:22px;text-align:center;color:var(--text-3);font-size:14px;font-variant-numeric:tabular-nums}
.no.top{color:var(--brand-text);font-weight:700}
.av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:17px;flex:none}
.nm{flex:1;font-size:16px}
.kn{color:var(--text-3);font-size:13px;font-variant-numeric:tabular-nums}
</style>
