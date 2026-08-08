<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { loadData } from '../api';
import { useAccount } from '../store/account';
const router = useRouter(); const acct = useAccount();
const pick = ref(null);
// 首页只做一件事：给一句今天的德语。其余入口收进底部导航，不在首页堆按钮。
onMounted(async () => {
  const cats = await loadData('categories');
  const all = cats.flatMap((c) => c.phrases);
  const day = Math.floor(Date.now() / 864e5);          // 同一天固定同一句，便于记忆
  pick.value = all[day % all.length];
});
</script>
<template>
  <div class="page">
    <h1 class="page-title">德语学习手册</h1>
    <p class="page-sub">面向中文母语者 · 每句都带谐音</p>

    <div v-if="pick" class="today">
      <div class="label">今天这句</div>
      <div class="de" lang="de">{{ pick.de }}</div>
      <div class="zh">{{ pick.zh }}</div>
      <div class="py">{{ pick.py }}</div>
    </div>

    <button class="btn btn-block" @click="router.push('/phrases')">开始学习</button>

    <!-- 查阅类入口：不是每天要点的，所以从导航移到这里 -->
    <div class="refs">
      <button class="level-tab" @click="router.push('/ref/pron')">发音</button>
      <button class="level-tab" @click="router.push('/ref/numbers')">数字</button>
      <button class="level-tab" @click="router.push('/ref/grammar')">语法</button>
      <button class="level-tab" @click="router.push('/boards')">图解</button>
    </div>
    <!-- 已登录时不再放「我的进度」：导航里就有「我的」，同一去处不占两个按钮 -->
    <button v-if="!acct.logged" class="btn btn-block btn-plain"
      @click="router.push('/login')">登录同步进度</button>
  </div>
</template>
<style scoped>
/* 必须 wrap：不换行的话 4 个胶囊在窄屏（或浏览器放大到 200%）下会把整个文档撑宽，
   全站出现横向滚动条 —— 溢出的是首页，症状却是每一页都能左右拖 */
.refs{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
.today{padding:28px 0 32px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:28px}
.label{font-size:12px;color:var(--text-3);letter-spacing:.08em;margin-bottom:12px}
.de{font-size:28px;font-weight:700;line-height:1.35;letter-spacing:-.02em}
.zh{font-size:16px;color:var(--text-2);margin-top:8px}
.py{font-size:14px;color:var(--text-3);margin-top:4px}
</style>
