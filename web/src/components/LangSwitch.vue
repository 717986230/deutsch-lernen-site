<script setup>
import { useLang } from '../store/lang';
const lang = useLang();
</script>
<template>
  <!-- 只在有双语内容的页面引用本组件；没有英语版的页面不该出现它 -->
  <div class="ls">
    <button class="l" :class="{on:lang.lang==='de'}" @click="lang.set('de')">🇩🇪 德语</button>
    <button class="l" :class="{on:lang.lang==='en'}" @click="lang.set('en')">🇬🇧 英语</button>
  </div>
</template>
<style scoped>
.ls{display:flex;gap:6px;margin:0 0 16px}
.l{flex:1;min-height:44px;padding:10px 0;border:1px solid var(--line);background:transparent;
  color:var(--text-2);border-radius:10px;font-size:14px;font-family:inherit;cursor:pointer}
.l.on{background:var(--brand);color:#14240a;border-color:var(--brand);font-weight:600}
</style>
