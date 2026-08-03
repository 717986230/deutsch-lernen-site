<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
const qr = import.meta.env.BASE_URL + 'support-qr.png';
</script>
<template>
  <div class="page">
    <h1 class="page-title">支持作者</h1>
    <p class="page-sub">这份手册一直免费、无广告</p>
    <p class="sp-p">从词句整理、发音朗读到测验复习，都是<b>业余时间一点点做出来、并持续维护</b>的；域名和时间都是实打实的成本。</p>
    <p class="sp-p">如果它在你学德语的路上帮上了忙，欢迎<b>随手打赏一点</b>，让它能继续更新下去 😊</p>
    <!-- 二维码沿用旧站资源，构建时从仓库根复制进 public -->
    <div class="qr"><img :src="qr" alt="微信收款二维码" loading="lazy"></div>
    <p class="sp-tip">一块两块都是心意，谢谢你的支持</p>
    <button class="btn btn-plain lg-link" @click="router.push('/legal')">隐私政策 · 用户协议</button>
  </div>
</template>
<style scoped>
.sp-p{font-size:15px;color:var(--text-2);line-height:1.9;margin:0 0 12px}
.qr{max-width:260px;margin:20px auto 8px;background:#fff;border-radius:16px;padding:8px}
.qr img{width:100%;display:block;border-radius:10px}
.sp-tip{text-align:center;font-size:13px;color:var(--text-3);margin:0 0 28px}
.lg-link{font-size:13px}
</style>
