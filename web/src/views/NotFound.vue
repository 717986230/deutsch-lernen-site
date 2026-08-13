<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<template>
  <div class="page not-found">
    <p class="hero-label">404</p>
    <h1 class="page-title">这个页面不存在</h1>
    <p class="page-sub">链接可能已过期，回到学习内容继续即可。</p>
    <div class="actions">
      <button class="btn" type="button" @click="router.replace('/phrases')">去语句练习</button>
      <button class="btn btn-plain" type="button" @click="router.replace('/reading')">读短文</button>
    </div>
  </div>
</template>

<style scoped>
.not-found{text-align:center;padding-top:72px}.actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:26px}
</style>
