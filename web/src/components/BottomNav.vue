<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLang } from '../store/lang';
const route = useRoute(); const router = useRouter();
const lang = useLang();

// 四个主目的地，与旧站底栏逐项一致（🏠首页 / 💬语句 / 📖短文 / 👤我的）。
// 「语句」是旧站对短语的叫法，沿用旧站的字，别自作聪明改成「短语」。
const TABS = [
  { p: '/home', i: '🏠', t: '首页' },
  { p: '/phrases', i: '💬', t: '语句' },
  { p: '/reading', i: '📖', t: '短文', match: ['/reading', '/series', '/dialog'] },
  { p: '/me', i: '👤', t: '我的', match: ['/me', '/login', '/register', '/reset'] },
];
const on = (tab) => (tab.match || [tab.p]).some((m) => route.path === m || route.path.startsWith(m + '/'));
// 登录墙内不显示底栏 —— 旧站是 :root.locked #bottomNav{display:none}
const show = computed(() => !['/login', '/register', '/reset'].includes(route.path));
</script>
<template>
  <nav v-if="show" id="bottomNav" aria-label="底部导航">
    <button v-for="t in TABS" :key="t.p" class="bn-btn" :class="{ on: on(t) }"
      :aria-current="on(t) ? 'page' : undefined" @click="router.push(t.p)">
      <span class="bn-i">{{ t.i }}</span><span class="bn-t">{{ t.t }}</span>
    </button>
  </nav>
</template>
<style scoped>
#bottomNav{position:fixed;left:0;right:0;bottom:0;z-index:300;display:flex;
  background:var(--surface);border-top:1px solid var(--border);
  box-shadow:0 -2px 12px rgba(0,0,0,.07);padding-bottom:env(safe-area-inset-bottom)}
.bn-btn{flex:1;border:0;background:none;font-family:inherit;cursor:pointer;
  /* 旧站是 padding:8px 0 7px，实测高度 47px；这里补到 ≥44px 的同时保持观感 */
  padding:7px 0 6px;min-height:44px;display:flex;flex-direction:column;align-items:center;gap:3px;
  color:var(--text-faint);transition:color .15s;-webkit-tap-highlight-color:transparent}
.bn-i{font-size:20px;line-height:1}
/* 旧站是 11px；本项目规定辅助文字 ≥12px */
.bn-t{font-size:12px;letter-spacing:1px}
/* 选中态旧站用 --gold(#58cc02)，浅底上只有 2.1:1，做文字不合格 → 用 --gold-text */
.bn-btn.on{color:var(--gold-text)}
.bn-btn.on .bn-t{font-weight:700}
.bn-btn:active{transform:translateY(1px)}
</style>
