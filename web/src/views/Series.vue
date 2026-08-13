<script setup>
// 「留学连载」——照旧站 #series 重做：一页到底，12 集全文直接铺开，
// 而不是原来那版「列表点进单集」。底部补上旧站的「正版视频资源」导航。
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { useLang } from '../store/lang';
import { loadGloss, splitWords, useLoopRead, glossVisible, toggleGloss } from '../api/reader';
defineOptions({ name: 'Series' });

const router = useRouter();
const langS = useLang();
const list = ref([]); const links = ref([]); const loading = ref(true);
const level = ref('all');
const rate = ref(0.62);
try { rate.value = JSON.parse(localStorage.getItem('spkCfg') || '{}').rate || 0.62; } catch { /* 默认 */ }

const LB = { a1: 'lb-a1', a2: 'lb-a2', b1: 'lb-b1', b2: 'lb-b2' };
const LN = { '0': '零基础', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2' };
const TABS = [['all', '📚 全部'], ['0', '🌱 零基础'], ['a1', '⭐ A1'], ['a2', '⭐⭐ A2'], ['b1', '🔥 B1'], ['b2', '💎 B2']];

async function load() {
  loading.value = true;
  list.value = await loadData(langS.file('series'));
  try { links.value = await loadData('links'); } catch { links.value = []; }
  try { await loadGloss(langS.lang, await loadData(langS.file('categories'))); } catch { /* 没小注也能读 */ }
  loading.value = false;
}
onMounted(load);
watch(() => langS.lang, () => { level.value = 'all'; load(); });

const shown = computed(() => list.value.filter((r) => level.value === 'all' || r.level === level.value));
const levelTabs = computed(() => TABS.filter(([k]) => k === 'all' || list.value.some((r) => r.level === k)));
const hasPinyin = computed(() => list.value.some((r) => r.paras.some((p) => p[2])));

const { playing, at, start, stop } = useLoopRead(() => (langS.isEn ? 'en-US' : 'de-DE'));
const mode = ref('');
const flat = computed(() => shown.value.flatMap((r) => r.paras.map((p) => p[0])));
function toggleLoopAll() {
  if (playing.value && mode.value === 'all') return void (stop(), mode.value = '');
  mode.value = 'all'; start(flat.value, rate.value);
}
function toggleEpisode(r) {
  const key = 'e' + shown.value.indexOf(r);
  if (playing.value && mode.value === key) return void (stop(), mode.value = '');
  mode.value = key; start(r.paras.map((p) => p[0]), rate.value);
}
const epPlaying = (r) => playing.value && mode.value === 'e' + shown.value.indexOf(r);
function setRate(v) {
  rate.value = +v;
  try { const c = JSON.parse(localStorage.getItem('spkCfg') || '{}'); c.rate = +v;
    localStorage.setItem('spkCfg', JSON.stringify(c)); } catch { /* 隐私模式 */ }
}
const say = (t) => { stop(); mode.value = ''; speak(t, langS.isEn ? 'en-US' : 'de-DE', rate.value); };
watch([level, () => langS.lang], () => { stop(); mode.value = ''; });
onBeforeUnmount(stop);
</script>

<template>
  <div class="page">
    <div class="hero-label">{{ langS.isEn ? 'Series' : 'Serie' }}</div>
    <h1 class="page-title">留学连载</h1>

    <div class="jump">
      <button class="level-tab" type="button" @click="router.push('/reading')">📖 短文</button>
      <button class="level-tab" type="button" @click="router.push({ path: '/reading', query: { topic: 'restaurant' } })">🍽️ 餐厅</button>
      <button class="level-tab active" type="button">🎬 连载</button>
      <button class="level-tab" type="button" @click="router.push('/dialog')">💬 对话</button>
    </div>
    <p class="page-sub">{{ langS.isEn ? '原创连续剧 · 中英对照 · 🔊 慢速朗读' : '原创连续剧 · 中德对照 · 🔊 慢速朗读 · 每句带谐音' }}</p>

    <div class="row">
      <button class="fab-read" :class="{ speaking: playing && mode === 'all' }" type="button"
        aria-label="循环朗读全部连载" @click="toggleLoopAll">
        {{ playing && mode === 'all' ? '⏹ 停止' : '🔊 全部朗读' }}
      </button>
    </div>
    <div class="rate">🐢 朗读语速
      <input type="range" min="0.35" max="1.6" step="0.05" :value="rate" @input="setRate($event.target.value)">
      <span class="rv">{{ rate }}</span> 🐇
    </div>

    <div class="sec-title">
      <span class="sec-title-icon">🎬</span><span class="sec-title-text">原创连载 · 留学生活</span>
      <span class="sec-title-count">共 {{ shown.length }} 集</span>
    </div>
    <p class="hint">每集一篇、剧情连贯 · ▶ 朗读整集 · 点句即听 · <b>{{ langS.isEn ? '英文词上方是词义' : '德语词上方是词义' }}</b>
      <button class="btn gloss-btn" type="button" @click="toggleGloss">{{ glossVisible ? '隐藏词义' : '显示词义' }}</button>
    </p>

    <div class="level-tabs">
      <button v-for="[k, lab] in levelTabs" :key="k" type="button"
        class="level-tab" :class="{ active: level === k }" @click="level = k">{{ lab }}</button>
    </div>

    <p v-if="loading" class="page-sub">加载中…</p>
    <div v-for="(r, ri) in shown" :key="ri" class="card art">
      <div class="art-head">
        <span class="art-title" :lang="langS.isEn ? 'en' : 'de'">{{ r.title }}</span>
        <span class="level-badge" :class="LB[r.level]">{{ LN[r.level] || r.level }}</span>
        <span class="art-zh">{{ r.zh }}</span>
        <button class="read-art-btn" :class="{ speaking: epPlaying(r) }" type="button"
          :aria-label="'朗读整集：' + r.title" @click="toggleEpisode(r)">
          {{ epPlaying(r) ? '⏹ 停止' : '▶ 朗读' }}
        </button>
      </div>
      <div v-for="(p, pi) in r.paras" :key="pi" class="read-para" :class="{ 'rp-on': epPlaying(r) && at === pi }">
        <button class="para-spk" type="button" aria-label="朗读本句" @click="say(p[0])">🔊</button>
        <div class="pbody">
          <div class="de" :lang="langS.isEn ? 'en' : 'de'"><span v-for="(t, ti) in splitWords(p[0])" :key="ti">
            <template v-if="t.sp">{{ t.sp }}</template>
            <ruby v-else-if="t.g && glossVisible">{{ t.w }}<rt>{{ t.g }}</rt></ruby>
            <template v-else>{{ t.w }}</template>
          </span></div>
          <div class="zh">{{ p[1] }}</div>
          <div v-if="hasPinyin && p[2]" class="py">{{ p[2] }}</div>
        </div>
      </div>
    </div>

    <!-- 正版视频资源：只做导航，不复制任何视频或字幕 -->
    <div class="sec-title" style="margin-top:32px">
      <span class="sec-title-icon">📺</span><span class="sec-title-text">正版视频资源 · 看原版</span>
    </div>
    <p class="hint left">以下为外部官方/平台资源，点击跳转观看<b>正版</b>。本站不复制其视频或字幕内容，仅提供导航。</p>
    <a v-for="(s, i) in links" :key="i" class="card link" :href="s.u" target="_blank" rel="noopener noreferrer">
      <div class="lk-head">
        <span class="lk-t" lang="de">{{ s.t }}</span>
        <span class="level-badge lb-a1">{{ s.lv }}</span>
      </div>
      <div class="lk-d">{{ s.d }}</div>
    </a>
  </div>
</template>

<style scoped>
.jump{display:flex;gap:8px;justify-content:center;margin:2px 0 10px;flex-wrap:wrap}
.row{display:flex;justify-content:center;margin:8px 0}
.fab-read{position:relative;min-height:44px;border:none;border-radius:24px;background:var(--gold);
  color:#14240a;font-size:14px;font-weight:600;font-family:inherit;padding:11px 18px;cursor:pointer}
.fab-read.speaking{background:var(--red);color:#fff}
.rate{text-align:center;margin:2px 0 6px;font-size:13px;color:var(--text-dim)}
.rate input[type=range]{vertical-align:middle;width:min(150px,60%);min-width:0;height:44px;
  background:transparent;accent-color:var(--gold)}
.rv{color:var(--gold-text);font-weight:600}
.hint{text-align:center;font-size:12px;color:var(--text-dim);margin:0 0 10px}
.hint.left{text-align:left}
.hint b{color:var(--gold-text)}
.gloss-btn{position:relative;min-height:44px;min-width:44px;padding:6px 12px;margin-left:6px;
  border-radius:14px;border:1px solid var(--gold-dim);background:var(--btn-bg);
  color:var(--gold-text);font-size:12px;font-family:inherit;cursor:pointer}
.art{margin-bottom:14px;cursor:default}
.art-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.art-title{min-width:0;font-size:17px;font-weight:600;color:var(--gold-text)}
.art-zh{font-size:13px;color:var(--text-dim)}
.level-badge{display:inline-block;padding:1px 6px;border-radius:8px;font-size:12px;font-weight:600;
  background:var(--surface-2);border:1px solid var(--border);color:var(--gold-text)}
.lb-a1{color:var(--lva1)}.lb-a2{color:var(--lva2)}.lb-b1{color:var(--lvb1)}.lb-b2{color:var(--lvb2)}
.read-art-btn{position:relative;margin-left:auto;flex-shrink:0;border:none;border-radius:16px;
  min-height:44px;background:var(--btn-bg);color:var(--gold-text);font-size:12px;font-weight:600;
  cursor:pointer;padding:5px 14px;white-space:nowrap;font-family:inherit}
.read-art-btn.speaking{background:#c9252b;color:#fff}
.read-para{display:flex;align-items:flex-start;gap:8px;padding:6px 4px;border-radius:10px}
.read-para.rp-on{background:var(--gold-faint)}
.para-spk{position:relative;flex-shrink:0;width:30px;height:30px;border:none;border-radius:50%;
  background:var(--gold-faint);color:var(--gold-text);font-size:14px;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;padding:0;font-family:inherit}
.para-spk::after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:44px;height:44px}
.pbody{flex:1;min-width:0}
.de{font-size:15px;color:var(--text);line-height:1.9}
.de ruby rt{font-size:10px;color:var(--text-dim);line-height:1}
.zh{font-size:13px;color:var(--text-dim);margin-top:2px}
.py{font-size:12px;color:var(--text-dim);margin-top:1px}
.link{display:block;text-decoration:none;margin-bottom:10px}
.lk-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.lk-t{min-width:0;font-size:15px;font-weight:600;color:var(--gold-text)}
.lk-head .level-badge{margin-left:auto}
.lk-d{font-size:13px;color:var(--text-dim);line-height:1.7}
</style>
