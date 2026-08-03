<script setup>
import { ref, onMounted } from 'vue';
import { loadData } from '../api';
import { useAccount } from '../store/account';
const acct = useAccount();
const stat = ref({ cats: 0, phrases: 0 });
onMounted(async () => {
  const cats = await loadData('categories');
  stat.value = { cats: cats.length, phrases: cats.reduce((n, c) => n + c.phrases.length, 0) };
});
</script>
<template>
  <div class="wrap">
    <h1>德语学习手册</h1>
    <p class="sub">面向中文母语者 · 每句都带谐音</p>
    <van-grid :column-num="2" :border="false">
      <van-grid-item icon="chat-o" :text="`${stat.phrases} 个短语`" to="/phrases" />
      <van-grid-item icon="records" text="分级短文" to="/reading" />
      <van-grid-item icon="bar-chart-o" text="排行榜" to="/rank" />
      <van-grid-item icon="user-o" :text="acct.logged ? '我的' : '登录'" :to="acct.logged ? '/me' : '/login'" />
    </van-grid>
  </div>
</template>
<style scoped>
.wrap{padding:20px 16px 80px}
h1{font-size:22px;margin:8px 0 4px}
.sub{color:var(--text-dim);font-size:13px;margin:0 0 16px}
</style>
