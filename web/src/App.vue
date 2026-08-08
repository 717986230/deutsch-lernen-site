<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccount } from './store/account';
import BadgeCelebrate from './components/BadgeCelebrate.vue';
import TopNav from './components/TopNav.vue';

const route = useRoute();
const router = useRouter();
const acct = useAccount();
const active = computed(() => route.path);
// 登录/注册/重置是「一屏一件事」的页面，底部 tab 在这里既点不动也只是噪音
const showTab = computed(() => !!route.meta.tab);
onMounted(() => {
  acct.fetchMe(); acct.sync();
  // 页面隐藏时补推一次，避免用户直接关掉导致最后一段进度丢失
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') acct.sync();
  });
});
const go = (p) => router.push(p);
</script>

<template>
  <div class="app">
    <TopNav />
    <!-- 离线提示：只在确实是网络故障时出现，业务错误不复用这个位置 -->
    <div v-if="acct.offline" class="offline">离线中，联网后自动同步</div>
    <router-view v-slot="{ Component }">
      <keep-alive include="Phrases,Reading,Spell"><component :is="Component" /></keep-alive>
    </router-view>
    <BadgeCelebrate />
  </div>
</template>

<style scoped>
.offline{background:var(--tip-bg);color:var(--tip-text);font-size:12px;
  text-align:center;padding:6px;position:sticky;top:0;z-index:99}
</style>
