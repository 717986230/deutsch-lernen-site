<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { useLang } from '../store/lang';
defineOptions({ name: 'Series' });
const langS = useLang();
const list = ref([]); const cur = ref(null);
async function load() { cur.value = null; list.value = await loadData(langS.file('series')); }
onMounted(load);
watch(() => langS.lang, load);
const idx = computed(() => cur.value ? list.value.indexOf(cur.value) : -1);
const go = (d) => { const i = idx.value + d; if (i >= 0 && i < list.value.length) { cur.value = list.value[i]; scrollTo(0,0); } };
</script>
<template>
  <div class="page">
    <template v-if="!cur">
      <h1 class="page-title">留学连载</h1>
      <p class="page-sub">留学生活 · 按顺序读</p>
      <div v-for="(r,i) in list" :key="i" class="item ep" @click="cur = r">
        <span class="no">{{ i + 1 }}</span>
        <span class="tx"><span class="ti">{{ r.title }}</span><span class="zh">{{ r.zh }}</span></span>
      </div>
    </template>
    <template v-else>
      <div class="bar"><button class="back tap" @click="cur = null">‹ 返回目录</button></div>
      <h2 class="at">{{ cur.title }}</h2>
      <p class="az">{{ cur.zh }}</p>
      <!-- series 是两元素 [de,zh]，按设计没有谐音，与 readings 的三元素区分 -->
      <div v-for="(p,i) in cur.paras" :key="i" class="item" @click="speak(p[0], langS.isEn ? 'en-US' : 'de-DE')">
        <div class="item-de" lang="de">{{ p[0] }}</div>
        <div class="item-zh">{{ p[1] }}</div>
      </div>
      <div class="nav">
        <button class="btn btn-block btn-plain" :disabled="idx <= 0" @click="go(-1)">‹ 上一集</button>
        <button class="btn btn-block btn-plain" :disabled="idx >= list.length - 1" @click="go(1)">下一集 ›</button>
      </div>
    </template>
  </div>
</template>
<style scoped>
.ep{display:flex;align-items:center;gap:14px}
.no{width:26px;text-align:center;color:var(--text-3);font-size:14px;font-variant-numeric:tabular-nums}
.tx{flex:1;min-width:0;display:flex;flex-direction:column}
.ti{font-size:16px;font-weight:600}
.zh{font-size:13px;color:var(--text-3);margin-top:2px}
.bar{padding:12px 0 4px;position:sticky;top:var(--bar-h);background:var(--bg);z-index:2}
.back{background:none;border:none;color:var(--brand-text);font-size:15px;font-family:inherit;cursor:pointer;padding:4px 0}
.at{font-size:22px;font-weight:700;margin:8px 0 2px;letter-spacing:-.02em}
.az{color:var(--text-3);font-size:14px;margin:0 0 12px}
.nav{display:flex;gap:8px;margin-top:22px}
.nav .btn{flex:1;font-size:14px}
</style>
