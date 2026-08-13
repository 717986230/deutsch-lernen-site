<script setup>
// 「阅读 · 连载」——照旧站 #reading 重做：一页到底，不是「列表点进详情」。
//   四个入口标签（短文/餐厅/连载/对话）→ 循环朗读 + 语速 → 隐藏词义
//   → 级别标签 → 篇数 → 每篇一张卡（标题+级别徽章+中文+▶朗读，下面逐句 🔊/德语/中文/谐音）
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { useLang } from '../store/lang';
import { loadGloss, splitWords, useLoopRead, glossVisible, toggleGloss } from '../api/reader';
defineOptions({ name: 'Reading' });

const router = useRouter();
const langS = useLang();
const list = ref([]); const loading = ref(true);
const topic = ref('');          // '' = 分级短文；'restaurant' = 餐厅专题
const level = ref('all');
const rate = ref(0.62);
try { rate.value = JSON.parse(localStorage.getItem('spkCfg') || '{}').rate || 0.62; } catch { /* 用默认 */ }

const LB = { '0': 'lb-0', a1: 'lb-a1', a2: 'lb-a2', b1: 'lb-b1', b2: 'lb-b2', c1: 'lb-c1', c2: 'lb-c2' };
const LN = { '0': '零基础', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1', c2: 'C2' };
const TABS = [['all', '📚 全部'], ['0', '🌱 零基础'], ['a1', '⭐ A1'], ['a2', '⭐⭐ A2'],
  ['b1', '🔥 B1'], ['b2', '💎 B2'], ['c1', '🏆 C1'], ['c2', '👑 C2']];

async function load() {
  loading.value = true;
  list.value = await loadData(langS.file('readings'));
  // 小注索引用词库现建，词库本来就要给别的页用，这里只是复用
  try { await loadGloss(await loadData(langS.file('categories'))); } catch { /* 没有小注也能读 */ }
  loading.value = false;
}
onMounted(load);
watch(() => langS.lang, () => { level.value = 'all'; topic.value = ''; load(); });

// 餐厅专题单列，不混进分级列表（与旧站 setReadTopic 规则一致）
const shown = computed(() => list.value.filter((r) => (
  topic.value === 'restaurant' ? r.topic === 'restaurant'
    : (r.topic !== 'restaurant' && (level.value === 'all' || r.level === level.value)))));
const levelTabs = computed(() => TABS.filter(([k]) => k === 'all'
  || list.value.some((r) => r.topic !== 'restaurant' && r.level === k)));

// ── 分批渲染：69 篇共 673 句，一次铺完低端机会卡（旧站同样分批）──
const CHUNK = 6;
const take = ref(CHUNK);
const visible = computed(() => shown.value.slice(0, take.value));
const more = computed(() => take.value < shown.value.length);
watch([topic, level, () => langS.lang], () => { take.value = CHUNK; stop(); });
const sentinel = ref(null);
let io = null;
onMounted(() => {
  if (!('IntersectionObserver' in window)) { take.value = 1e9; return; }
  io = new IntersectionObserver((es) => { if (es[0].isIntersecting && more.value) take.value += CHUNK; },
    { rootMargin: '700px' });
  nextTick(() => sentinel.value && io.observe(sentinel.value));
});
onBeforeUnmount(() => { io && io.disconnect(); stop(); });

// ── 朗读 ──
const { playing, at, start, stop } = useLoopRead(() => (langS.isEn ? 'en-US' : 'de-DE'));
const loopMode = ref('');       // '' 停止 / 'all' 循环全部 / 索引 单篇
const flat = computed(() => shown.value.flatMap((r) => r.paras.map((p) => p[0])));
function toggleLoopAll() {
  if (playing.value && loopMode.value === 'all') return void (stop(), loopMode.value = '');
  loopMode.value = 'all'; start(flat.value, rate.value);
}
function toggleArticle(r) {
  const key = 'a' + shown.value.indexOf(r);
  if (playing.value && loopMode.value === key) return void (stop(), loopMode.value = '');
  loopMode.value = key; start(r.paras.map((p) => p[0]), rate.value);
}
const artPlaying = (r) => playing.value && loopMode.value === 'a' + shown.value.indexOf(r);
function setRate(v) {
  rate.value = +v;
  try { const c = JSON.parse(localStorage.getItem('spkCfg') || '{}'); c.rate = +v;
    localStorage.setItem('spkCfg', JSON.stringify(c)); } catch { /* 隐私模式 */ }
}
const say = (t) => { stop(); loopMode.value = ''; speak(t, langS.isEn ? 'en-US' : 'de-DE', rate.value); };
</script>

<template>
  <div class="page">
    <div class="hero-label">{{ langS.isEn ? 'Reading' : 'Lesen' }}</div>
    <h1 class="page-title">阅读 · 连载</h1>

    <div class="jump">
      <button class="level-tab" :class="{ active: topic === '' }" type="button" @click="topic = ''">📖 短文</button>
      <button class="level-tab" :class="{ active: topic === 'restaurant' }" type="button" @click="topic = 'restaurant'">🍽️ 餐厅</button>
      <button class="level-tab" type="button" @click="router.push('/series')">🎬 连载</button>
      <button class="level-tab" type="button" @click="router.push('/dialog')">💬 对话</button>
    </div>
    <p class="page-sub">0基础 → C2 循序渐进 · 中德对照 · 🔊 慢速朗读</p>

    <div class="row">
      <button class="fab-read" :class="{ speaking: playing && loopMode === 'all' }" type="button"
        aria-label="循环朗读全部短文" @click="toggleLoopAll">
        {{ playing && loopMode === 'all' ? '⏹ 停止' : '🔊 循环朗读' }}
      </button>
    </div>
    <div class="rate">🐢 朗读语速
      <input type="range" min="0.35" max="1.6" step="0.05" :value="rate" @input="setRate($event.target.value)">
      <span class="rv">{{ rate }}</span> 🐇
    </div>
    <p class="hint">▶ 整篇朗读 · 点句即听 · <b>德语词上方是词义</b>
      <button class="btn gloss-btn" type="button" @click="toggleGloss">{{ glossVisible ? '隐藏词义' : '显示词义' }}</button>
    </p>

    <div v-if="topic === ''" class="level-tabs">
      <button v-for="[k, lab] in levelTabs" :key="k" type="button"
        class="level-tab" :class="{ active: level === k }" @click="level = k">{{ lab }}</button>
    </div>
    <div class="count">共 {{ shown.length }} 篇短文</div>

    <p v-if="loading" class="page-sub">加载中…</p>
    <div v-for="(r, ri) in visible" :key="ri" class="card art">
      <div class="art-head">
        <span class="art-title" lang="de">{{ r.title }}</span>
        <span class="level-badge" :class="LB[r.level]">{{ LN[r.level] || r.level }}</span>
        <span class="art-zh">{{ r.zh }}</span>
        <button class="read-art-btn" :class="{ speaking: artPlaying(r) }" type="button"
          :aria-label="'朗读全文：' + r.title" @click="toggleArticle(r)">
          {{ artPlaying(r) ? '⏹ 停止' : '▶ 朗读' }}
        </button>
      </div>
      <div v-for="(p, pi) in r.paras" :key="pi" class="read-para"
        :class="{ 'rp-on': artPlaying(r) && at === pi }">
        <button class="para-spk" type="button" aria-label="朗读本句" @click="say(p[0])">🔊</button>
        <div class="pbody">
          <div class="de" lang="de"><span v-for="(t, ti) in splitWords(p[0])" :key="ti">
            <template v-if="t.sp">{{ t.sp }}</template>
            <ruby v-else-if="t.g && glossVisible">{{ t.w }}<rt>{{ t.g }}</rt></ruby>
            <template v-else>{{ t.w }}</template>
          </span></div>
          <div class="zh">{{ p[1] }}</div>
          <div v-if="p[2]" class="py">{{ p[2] }}</div>
        </div>
      </div>
    </div>
    <div ref="sentinel" style="height:1px"></div>
    <p v-if="more" class="page-sub">继续下滑加载更多…（{{ visible.length }} / {{ shown.length }} 篇）</p>
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
.hint{text-align:center;font-size:12px;color:var(--text-faint);margin-bottom:6px}
.hint b{color:var(--gold-text)}
.gloss-btn{position:relative;min-height:44px;min-width:44px;padding:6px 12px;margin-left:6px;
  border-radius:14px;border:1px solid var(--gold-dim);background:var(--btn-bg);
  color:var(--gold-text);font-size:12px;font-family:inherit;cursor:pointer}
.count{font-size:12px;color:var(--gold-text);margin:4px 0 10px}
.art{margin-bottom:14px;cursor:default}
.art-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.art-title{min-width:0;font-size:17px;font-weight:600;color:var(--gold-text)}
.art-zh{font-size:13px;color:var(--text-dim)}
.level-badge{display:inline-block;padding:1px 6px;border-radius:8px;font-size:12px;font-weight:600;
  background:var(--surface-2);border:1px solid var(--border);color:var(--gold-text)}
.lb-0{color:var(--lv0)}.lb-a1{color:var(--lva1)}.lb-a2{color:var(--lva2)}
.lb-b1{color:var(--lvb1)}.lb-b2{color:var(--lvb2)}.lb-c1{color:var(--lvb1)}.lb-c2{color:var(--lvb2)}
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
</style>
