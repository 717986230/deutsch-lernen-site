<script setup>
import { ref, watch } from 'vue';
import { useAccount } from '../store/account';
const acct = useAccount();
const cur = ref(null);
// 逐个弹，不叠加——一次点亮多枚时排队展示
watch(() => acct.celebrate.length, (n) => { if (n && !cur.value) next(); });
function next() { cur.value = acct.popCelebrate() || null; }
const goal = (b) => b.m ? `达成 ${b.n}${b.m === 'best' ? ' 天连续打卡' : b.m === 'known' ? ' 个掌握词' : b.m === 'quiz' ? ' 题测验' : ' 次学习'}` : (b.desc || '');
</script>
<template>
  <div v-if="cur" class="ov" @click="next">
    <div class="box">
      <span class="emo">{{ cur.emo }}</span>
      <div class="tag">徽 章 解 锁</div>
      <div class="nm">{{ cur.name }}</div>
      <div class="ds">{{ goal(cur) }}</div>
      <div class="hint">轻触任意处继续</div>
    </div>
  </div>
</template>
<style scoped>
.ov{position:fixed;inset:0;z-index:1600;background:rgba(10,14,10,.62);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  display:flex;align-items:center;justify-content:center;padding:20px}
.box{background:var(--surface);border:1px solid var(--line);border-radius:20px;
  padding:34px 26px;text-align:center;max-width:320px;width:100%}
.emo{font-size:64px;line-height:1}
.tag{font-size:12px;letter-spacing:.3em;color:var(--brand-text);margin-top:14px;font-weight:600}
.nm{font-size:24px;font-weight:700;margin-top:6px}
.ds{font-size:14px;color:var(--text-2);margin-top:6px}
.hint{font-size:12px;color:var(--text-3);margin-top:18px}
</style>
