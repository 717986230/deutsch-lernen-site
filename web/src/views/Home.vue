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

    <div class="refs">
      <button class="seg" @click="router.push('/ref/pron')">发音</button>
      <button class="seg" @click="router.push('/ref/numbers')">数字</button>
      <button class="seg" @click="router.push('/ref/grammar')">语法</button>
      <button class="seg" @click="router.push('/boards')">图解</button>
    </div>
    <button class="btn" @click="router.push('/phrases')">开始学习</button>
    <button class="btn btn-plain" style="margin-top:10px"
      @click="router.push(acct.logged ? '/me' : '/login')">
      {{ acct.logged ? '我的进度' : '登录同步进度' }}
    </button>
  </div>
</template>
<style scoped>
.refs{display:flex;gap:6px;margin:0 0 12px}
.today{padding:28px 0 32px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:28px}
.label{font-size:12px;color:var(--text-3);letter-spacing:.08em;margin-bottom:12px}
.de{font-size:28px;font-weight:700;line-height:1.35;letter-spacing:-.02em}
.zh{font-size:16px;color:var(--text-2);margin-top:8px}
.py{font-size:14px;color:var(--text-3);margin-top:4px}
</style>
