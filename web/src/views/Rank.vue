<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '../api';
const BY = [['known', '词汇'], ['streak', '连续'], ['total', '总量']];
const by = ref('known'); const rows = ref([]); const total = ref(0); const loading = ref(true); const err = ref('');
// 只显示前十。其余不提供展开 —— 名次靠后的具体是谁没人关心，
// 给个总数让用户知道「榜上还有多少人」就够了。
const TOP = 10;
const shown = computed(() => rows.value.slice(0, TOP));
const restCount = computed(() => Math.max(0, total.value - TOP));
async function load() {
  loading.value = true; err.value = '';
  const r = await api.leaderboard(by.value);
  loading.value = false;
  if (r.ok) {
    rows.value = r.data.list || [];
    total.value = Number.isFinite(Number(r.data.total)) ? Number(r.data.total) : rows.value.length;
  }
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
    <div class="level-tabs">
      <button v-for="[v, t] in BY" :key="v" class="level-tab" :class="{ active: by === v  }"
        @click="by = v">{{ t }}</button>
    </div>
    <p v-if="loading" class="page-sub">加载中…</p>
    <p v-else-if="err" class="page-sub">{{ err }}</p>
    <p v-else-if="!rows.length" class="page-sub">还没有人上榜</p>
    <div v-for="(u, i) in shown" :key="i" class="item rk" @click="$router.push('/u/' + u.username)">
      <span class="no" :class="{ top: i < 3 }">{{ ['🥇','🥈','🥉'][i] || i + 1 }}</span>
      <span class="av" :style="{ background: u.av_bg || 'var(--line)' }">{{ u.avatar || '🦊' }}</span>
      <span class="nm">{{ u.nickname || u.username }}</span>
      <span class="kn">{{ val(u) }}</span>
    </div>
    <p v-if="restCount" class="more">榜上另有 {{ restCount }} 人</p>
  </div>
</template>
<style scoped>
.more{margin-top:16px;text-align:center;font-size:13px;color:var(--text-3)}
.rk{display:flex;align-items:center;gap:12px}
.no{width:22px;text-align:center;color:var(--text-3);font-size:14px;font-variant-numeric:tabular-nums}
.no.top{color:var(--brand-text);font-weight:700}
.av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:17px;flex:none}
.nm{flex:1;font-size:16px}
.kn{color:var(--text-3);font-size:13px;font-variant-numeric:tabular-nums}
</style>
