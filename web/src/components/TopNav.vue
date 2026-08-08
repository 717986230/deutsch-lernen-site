<script setup>
import { useRoute, useRouter } from 'vue-router';
import { useLang } from '../store/lang';
const route = useRoute(); const router = useRouter();
const lang = useLang();
// 导航项与旧站顺序一致；短文/连载/对话共用「阅读」高亮（旧站也是这么做的）
const NAV = [
  ['/', '🏠 首页'], ['/phrases', '📖 短语'], ['/reading', '📚 短文'],
  ['/spell', '⌨️ 拼写'], ['/quiz', '🎯 测验'], ['/boards', '🖼️ 图解'],
  ['/ref/grammar', '📐 语法'], ['/ref/pron', '🔤 发音'], ['/ref/numbers', '🔢 数字'],
  ['/rank', '🏆 排行榜'], ['/me', '👤 我的'], ['/support', '❤️ 支持'],
];
const on = (p) => p === '/' ? route.path === '/'
  : (p === '/reading' ? ['/reading', '/series', '/dialog'].includes(route.path) : route.path.startsWith(p));
</script>
<template>
  <div id="topbar">
    <div id="nav">
      <button v-for="[p, t] in NAV" :key="p" class="nav-btn" :class="{ active: on(p) }"
        @click="router.push(p)">{{ t }}</button>
    </div>
    <div class="lang-switch">
      <button class="lang-btn" :class="{ active: lang.lang === 'de' }" title="德语" @click="lang.set('de')">🇩🇪</button>
      <button class="lang-btn" :class="{ active: lang.lang === 'en' }" title="英语" @click="lang.set('en')">🇬🇧</button>
    </div>
  </div>
</template>
<style scoped>
/* 与旧站同构：固定顶栏、左侧导航横滑、右侧语言切换独占一列 */
#topbar{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;
  background:var(--nav-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--gold-faint);padding:0 6px}
#nav{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow-x:auto;scrollbar-width:none}
#nav::-webkit-scrollbar{display:none}
.nav-btn{flex-shrink:0;padding:9px 11px;margin:6px 2px;min-height:44px;font-size:12px;
  letter-spacing:.5px;color:var(--text-dim);background:none;border:none;border-radius:18px;
  font-family:inherit;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}
/* 选中态用深绿字压品牌绿，而非旧站的白字 —— 白字在 #58cc02 上仅 2.1:1 */
.nav-btn.active{color:#14240a;background:var(--gold);font-weight:700}
.lang-switch{flex:0 0 auto;margin-left:6px;display:flex;background:var(--surface);
  border:1px solid var(--gold-faint);border-radius:14px;overflow:hidden;
  box-shadow:-12px 0 10px -6px var(--bg2),0 1px 4px rgba(0,0,0,.08)}
.lang-btn{min-width:44px;min-height:44px;border:none;background:none;font-size:15px;cursor:pointer;padding:0 6px}
.lang-btn.active{background:var(--gold-faint)}
</style>
