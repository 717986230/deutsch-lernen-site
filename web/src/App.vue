<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAccount } from './store/account';

const route = useRoute();
const router = useRouter();
const acct = useAccount();
const active = computed(() => route.path);
// 登录/注册/重置是「一屏一件事」的页面，底部 tab 在这里既点不动也只是噪音
const showTab = computed(() => !!route.meta.tab);
onMounted(() => acct.fetchMe());
const go = (p) => router.push(p);
</script>

<template>
  <div class="app">
    <!-- 离线提示：只在确实是网络故障时出现，业务错误不复用这个位置 -->
    <div v-if="acct.offline" class="offline">离线中，联网后自动同步</div>
    <router-view v-slot="{ Component }">
      <keep-alive include="Phrases,Reading"><component :is="Component" /></keep-alive>
    </router-view>
    <van-tabbar v-if="showTab" :model-value="active" @change="go" fixed placeholder route>
      <van-tabbar-item name="/" icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item name="/phrases" icon="chat-o" to="/phrases">短语</van-tabbar-item>
      <van-tabbar-item name="/reading" icon="records" to="/reading">短文</van-tabbar-item>
      <van-tabbar-item name="/rank" icon="bar-chart-o" to="/rank">排行</van-tabbar-item>
      <van-tabbar-item name="/me" icon="user-o" to="/me">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.offline{background:var(--tip-bg);color:var(--tip-text);font-size:12px;
  text-align:center;padding:6px;position:sticky;top:0;z-index:99}
</style>
