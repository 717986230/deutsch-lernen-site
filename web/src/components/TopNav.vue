<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLang } from '../store/lang';
const route = useRoute(); const router = useRouter();
const lang = useLang();
// 只留学习主线 + 账号。语法/发音/数字/图解这四个是**查阅**性质的，不是每天要点的，
// 收进首页的参考行；支持作者收进「我的」。导航从 12 项减到 7 项。
const NAV = [
  ['/', '🏠 首页'], ['/phrases', '📖 短语'], ['/reading', '📚 短文'],
  ['/spell', '⌨️ 拼写'], ['/quiz', '🎯 测验'],
  ['/rank', '🏆 排行'], ['/me', '👤 我的'],
];
const on = (p) => p === '/' ? route.path === '/'
  : (p === '/reading' ? ['/reading', '/series', '/dialog'].includes(route.path) : route.path.startsWith(p));

// 下滑隐藏、上滑显示。阈值 8px 防抖：手指微颤不该让顶栏闪烁；
// 顶部 64px 内一律显示，否则回到页首时顶栏还藏着，看着像丢了。
const hidden = ref(false);
let last = 0, ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = Math.max(0, window.scrollY);
    if (y < 64) hidden.value = false;
    else if (Math.abs(y - last) > 8) hidden.value = y > last;
    last = y; ticking = false;
  });
}
onMounted(() => { last = window.scrollY; window.addEventListener('scroll', onScroll, { passive: true }); });
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>
<template>
  <div id="topbar" :class="{ away: hidden }">
    <div id="nav">
      <button v-for="[p, t] in NAV" :key="p" class="nav-btn" :class="{ active: on(p) }"
        @click="router.push(p)">{{ t }}</button>
    </div>
    <!-- 一个按钮而不是两个：显示当前语言，点一下切到另一种。
         省掉一半宽度 —— 两个 44px 按钮在 200% 缩放下会占满右半屏、把导航挤到点不动。 -->
    <button class="lang-btn" :title="lang.isEn ? '当前英语，点击切换到德语' : '当前德语，点击切换到英语'"
      :aria-label="lang.isEn ? '当前英语，点击切换到德语' : '当前德语，点击切换到英语'"
      @click="lang.set(lang.isEn ? 'de' : 'en')">{{ lang.isEn ? '🇬🇧' : '🇩🇪' }}</button>
  </div>
</template>
<style scoped>
/* 与旧站同构：固定顶栏、左侧导航横滑、右侧语言切换独占一列 */
#topbar{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;
  background:var(--nav-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--gold-faint);padding:0 6px;
  transition:transform .22s ease}
#topbar.away{transform:translateY(-100%)}
@media (prefers-reduced-motion:reduce){#topbar{transition:none}}
#nav{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow-x:auto;scrollbar-width:none}
#nav::-webkit-scrollbar{display:none}
.nav-btn{flex-shrink:0;padding:9px 11px;margin:6px 2px;min-height:44px;font-size:12px;
  letter-spacing:.5px;color:var(--text-dim);background:none;border:none;border-radius:18px;
  font-family:inherit;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}
/* 选中态用深绿字压品牌绿，而非旧站的白字 —— 白字在 #58cc02 上仅 2.1:1 */
.nav-btn.active{color:#14240a;background:var(--gold);font-weight:700}
.lang-btn{flex:0 0 auto;margin-left:6px;min-width:44px;min-height:44px;font-size:17px;
  cursor:pointer;padding:0;background:var(--surface);border:1px solid var(--gold-faint);
  border-radius:14px;box-shadow:-12px 0 10px -6px var(--bg2),0 1px 4px rgba(0,0,0,.08)}
</style>
