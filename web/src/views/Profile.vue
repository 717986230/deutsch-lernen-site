<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api';
import { BADGES } from '../api/study';
const route = useRoute(); const router = useRouter();
const d = ref(null); const err = ref(''); const busy = ref(false);

async function load() {
  err.value = ''; d.value = null;
  const r = await api.profile(route.params.name);
  if (r.ok) d.value = r.data;
  else err.value = r.offline ? '离线中，联网后重试' : (r.data.err || '加载失败');
}
onMounted(load); watch(() => route.params.name, load);

async function toggle() {
  if (busy.value || !d.value) return;
  busy.value = true;
  const fn = d.value.isFollowing ? api.unfollow : api.follow;
  const r = await fn(d.value.user.username);
  busy.value = false;
  if (r.ok) load();          // 重拉以拿到最新的粉丝数，不本地猜
  else err.value = r.data.err || '操作失败';
}
const earned = (u) => (u.badges || '').split(',').filter(Boolean);
const lit = (u, b) => earned(u).includes(b.id);
</script>

<template>
  <div class="page">
    <div class="bar"><button class="back tap" @click="router.back()">‹ 返回</button></div>
    <p v-if="err" class="page-sub">{{ err }}</p>
    <p v-else-if="!d" class="page-sub">加载中…</p>
    <template v-else>
      <div class="hd">
        <span class="av" :style="{background: d.user.av_bg || 'var(--brand)'}">{{ d.user.avatar || '🦊' }}</span>
        <div class="nm">{{ d.user.nickname || d.user.username }}</div>
        <div class="un">@{{ d.user.username }}</div>
        <div v-if="d.user.sig" class="sig">{{ d.user.sig }}</div>
      </div>

      <div class="nums">
        <div class="n"><b>{{ d.user.known || 0 }}</b><span>掌握词</span></div>
        <div class="n"><b>{{ d.user.best_streak || 0 }}</b><span>最长打卡</span></div>
        <div class="n"><b>{{ d.followers || 0 }}</b><span>粉丝</span></div>
        <div class="n"><b>{{ d.following || 0 }}</b><span>关注</span></div>
      </div>
      <div class="rk">第 {{ d.rank }} 名 · {{ d.user.level || 'A1' }}</div>

      <button v-if="!d.isMe" class="btn btn-block" :class="{ 'btn-plain': d.isFollowing }"
        :disabled="busy" @click="toggle">{{ d.isFollowing ? '已关注 · 取消' : '关注 TA' }}</button>

      <div class="group">徽章 {{ earned(d.user).length }} / {{ BADGES.length }}</div>
      <div class="bg">
        <div v-for="b in BADGES" :key="b.id" class="bd" :class="{ on: lit(d.user, b) }" :title="b.name">
          <div class="be">{{ b.emo }}</div><div class="bn">{{ b.name }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bar{padding:12px 0 4px}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;font-family:inherit;cursor:pointer;padding:4px 0}
.hd{text-align:center;padding:12px 0 20px}
.av{width:76px;height:76px;border-radius:50%;display:inline-flex;align-items:center;
  justify-content:center;font-size:40px}
.nm{font-size:22px;font-weight:700;margin-top:12px}
.un{font-size:13px;color:var(--text-3);margin-top:2px}
.sig{font-size:14px;color:var(--text-2);margin-top:8px}
.nums{display:flex;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0}
.n{flex:1;text-align:center}
.n b{display:block;font-size:20px;font-variant-numeric:tabular-nums}
.n span{font-size:12px;color:var(--text-3)}
.rk{text-align:center;font-size:13px;color:var(--text-3);margin:12px 0 16px}
.bg{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin:6px 0 18px}
.bd{border:1px solid var(--line);border-radius:12px;padding:10px 4px;text-align:center;opacity:.35}
.bd.on{opacity:1;border-color:var(--brand)}
.be{font-size:24px;line-height:1}
.bn{font-size:12px;margin-top:4px}
</style>
