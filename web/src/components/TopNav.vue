<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLang } from '../store/lang';
import { useTheme } from '../store/theme';
const route = useRoute(); const router = useRouter();
const lang = useLang(); const theme = useTheme();

// 与旧站同一套分工：顶栏放**次级**入口（练习与查阅），四个主目的地在底部标签栏。
// nav-de-only 的项在英语模式下隐藏 —— 拼写/语法/发音/数字的内容是德语专有的。
const NAV = [
  { p: '/spell', t: '⌨️ 拼写', de: true },
  { p: '/quiz', t: '🎯 测验' },
  { p: '/ref/grammar', t: '📐 语法', de: true },
  { p: '/ref/pron', t: '🔤 发音', de: true },
  { p: '/ref/numbers', t: '🔢 数字', de: true },
  { p: '/boards', t: '🖼️ 图解', de: true },
  { p: '/rank', t: '🏆 排行榜' },
  { p: '/support', t: '❤️ 支持' },
];
const items = computed(() => NAV.filter((n) => !(n.de && lang.isEn)));
const on = (p) => route.path.startsWith(p);

// 图解只有德语数据（没有 en_boards.json），在那儿显示语言开关是骗人的 —— 只藏国旗，
// 主题切换必须留着：旧站把两者塞进同一个容器一起隐藏，结果那几页彻底没了深色模式入口。
const langOK = computed(() => !route.path.startsWith('/boards'));

// 下滑隐藏、上滑显示。阈值 8px 防抖；顶部 64px 内一律显示，否则回到页首顶栏还藏着像丢了。
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
      <button v-for="n in items" :key="n.p" class="nav-btn" :class="{ active: on(n.p) }"
        @click="router.push(n.p)">{{ n.t }}</button>
    </div>
    <div class="ctl">
      <!-- 一个按钮而不是两个：显示当前语言，点一下切到另一种，宽度减半 -->
      <button v-if="langOK" class="ctl-btn"
        :aria-label="lang.isEn ? '当前英语，点击切换到德语' : '当前德语，点击切换到英语'"
        :title="lang.isEn ? '当前英语，点击切换到德语' : '当前德语，点击切换到英语'"
        @click="lang.set(lang.isEn ? 'de' : 'en')">{{ lang.isEn ? '🇬🇧' : '🇩🇪' }}</button>
      <button class="ctl-btn" aria-label="切换深色/浅色模式" title="深色/浅色"
        @click="theme.toggle()">{{ theme.dark ? '☀️' : '🌙' }}</button>
    </div>
  </div>
</template>
<style scoped>
/* 与旧站同构：固定顶栏、左侧导航横滑、右侧控件独占一列 */
#topbar{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;
  background:var(--nav-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--gold-faint);padding:0 6px;transition:transform .22s ease}
#topbar.away{transform:translateY(-100%)}
@media (prefers-reduced-motion:reduce){#topbar{transition:none}}
#nav{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow-x:auto;scrollbar-width:none}
#nav::-webkit-scrollbar{display:none}
.nav-btn{flex-shrink:0;padding:9px 11px;margin:6px 2px;min-height:44px;font-size:12px;
  letter-spacing:.5px;color:var(--text-dim);background:none;border:none;border-radius:18px;
  font-family:inherit;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent}
/* 选中态用深绿字压品牌绿，而非旧站的白字 —— 白字在 #58cc02 上仅 2.1:1 */
.nav-btn.active{color:#14240a;background:var(--gold);font-weight:700}
/* 语言开关藏起来时整个按钮 display:none，容器随之收窄，导航立刻把这块宽度收回去。
   旧站用的是 visibility:hidden，布局盒子还在，顶栏右边永久空着 114px —— 那就是「顶部一半白」。 */
.ctl{flex:0 0 auto;margin-left:6px;display:flex;background:var(--surface);
  border:1px solid var(--gold-faint);border-radius:14px;overflow:hidden;
  box-shadow:-12px 0 10px -6px var(--bg2),0 1px 4px rgba(0,0,0,.08)}
.ctl-btn{min-width:44px;min-height:44px;border:none;background:none;font-size:17px;
  cursor:pointer;padding:0;font-family:inherit}
.ctl-btn+.ctl-btn{border-left:1px solid var(--gold-faint)}
</style>
