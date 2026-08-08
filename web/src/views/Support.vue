<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
const qr = import.meta.env.BASE_URL + 'support-qr.png';
</script>
<template>
  <div class="page">
    <h1 class="page-title">支持作者</h1>
    <p class="page-sub">这份手册一直免费、无广告</p>
    <p class="sp-p">如果它帮上了忙，欢迎随手打赏一点，让它继续更新下去。</p>
    <!-- 二维码沿用旧站资源，构建时从仓库根复制进 public -->
    <div class="qr"><img :src="qr" alt="微信收款二维码" loading="lazy"></div>
    <button class="link" @click="router.push('/legal')">隐私政策 · 用户协议</button>
  </div>
</template>
<style scoped>
.sp-p{font-size:15px;color:var(--text-2);line-height:1.9;margin:0 0 12px;text-align:center}
.qr{max-width:260px;margin:20px auto 8px;background:#fff;border-radius:16px;padding:8px}
.qr img{width:100%;display:block;border-radius:10px}
.link{display:block;margin:28px auto 0;background:none;border:none;font-family:inherit;
  font-size:13px;color:var(--text-2);cursor:pointer;padding:12px;text-decoration:underline}
</style>
