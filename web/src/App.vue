<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAccount } from './store/account';
import BadgeCelebrate from './components/BadgeCelebrate.vue';
import TopNav from './components/TopNav.vue';
import BottomNav from './components/BottomNav.vue';
import DailyBoost from './components/DailyBoost.vue';
import { useTheme } from './store/theme';

const acct = useAccount();
const theme = useTheme();
const route = useRoute();
// 与旧站的 locked 状态一致：登录、注册、找回密码时只呈现账号流程，
// 不让学习导航抢走注意力，也避免看起来像「登录页嵌在学习页里」。
const isAuthFlow = computed(() => route.meta.guest === true);
onMounted(() => {
  theme.init();
  acct.fetchMe(); acct.sync();
  // 页面隐藏时补推一次，避免用户直接关掉导致最后一段进度丢失
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') acct.sync();
  });
});
</script>

<template>
  <div class="app">
    <TopNav v-if="!isAuthFlow" />
    <!-- 离线提示：只在确实是网络故障时出现，业务错误不复用这个位置 -->
    <div v-if="acct.offline && !isAuthFlow" class="offline">离线中，联网后自动同步</div>
    <main id="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive include="Phrases,Reading,Spell"><component :is="Component" /></keep-alive>
      </router-view>
    </main>
    <BottomNav />
    <DailyBoost v-if="!isAuthFlow" />
    <BadgeCelebrate v-if="!isAuthFlow" />
  </div>
</template>

<style scoped>
/* 固定在顶栏**下方**：z-index 比顶栏低、top 等于顶栏高度。
   原来是 sticky top:0 z-index:99，会滑到固定顶栏底下，等于没有提示。 */
.offline{position:fixed;left:0;right:0;top:56px;z-index:150;
  background:var(--tip-bg);color:var(--tip-text);font-size:12px;text-align:center;padding:6px}
</style>
