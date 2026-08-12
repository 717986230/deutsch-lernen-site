<script setup>
// 「词句大全」——**照旧站 #phrases 重做**，结构与控件逐项对齐 src.html：
//   hero-label / 标题 / 副标题 → 词性上色图例 → 搜索框 + 最近搜索 → 级别标签
//   → 级别说明 → 分类横滑标签 → 循环朗读 + 朗读设置 → 只看没学会的 → 结果数 → 卡片流
// 卡片同样是「点一下翻面看谐音」，而不是我原来那版「分级列表点进分类」的两级结构。
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { loadData } from '../api';
import { speak } from '../api/speak';
import { useLang } from '../store/lang';
import { useAccount } from '../store/account';
import { getKnown, markKnown, unmarkKnown, setLastStudy } from '../api/practice';
import { studyTick } from '../api/study';
defineOptions({ name: 'Phrases' });

const langS = useLang();
const acct = useAccount();

// ── 级别定义：与旧站 levelMeta / levelMetaEN 一致（德语按 CEFR，英语按国内考试体系）──
const META_DE = {
  all: { label: '全部', desc: '', color: 'var(--gold-text)' },
  '0': { label: '🌱 零基础', desc: '打招呼·道别·礼貌用语，第一天就能开口！', color: 'var(--lv0)' },
  a1: { label: '⭐ A1 初级', desc: '自我介绍·时间·天气·家庭，能进行最简单的日常交流。', color: 'var(--lva1)' },
  a2: { label: '⭐⭐ A2 基础', desc: '购物·点餐·交通·住宿，能在熟悉场景下顺畅沟通。', color: 'var(--gold-text)' },
  b1: { label: '🔥 B1 中级', desc: '情感·医疗·银行·社会·抽象词汇，能理解日常生活主要内容。', color: 'var(--lvb1)' },
  b2: { label: '💎 B2 中高级', desc: '政府·科技·经济·历史·学术，接近流利日常交流水平。', color: 'var(--lvb2)' },
};
const META_EN = {
  all: { label: '全部', desc: '', color: 'var(--gold-text)' },
  '0': { label: '🌱 入门', desc: '最常用的问候与日常，零基础就能开口。', color: 'var(--lv0)' },
  a1: { label: '⭐ 中考', desc: '初中水平高频词句。', color: 'var(--lva1)' },
  a2: { label: '⭐⭐ 高考', desc: '高中水平常用表达。', color: 'var(--gold-text)' },
  b1: { label: '🔥 四级', desc: 'CET-4 词汇与表达。', color: 'var(--lvb1)' },
  b2: { label: '💎 六级', desc: 'CET-6 进阶词汇。', color: 'var(--lvb2)' },
};
const TABS_DE = [['all', '📚 全部'], ['0', '🌱 零基础'], ['a1', '⭐ A1'], ['a2', '⭐⭐ A2'], ['b1', '🔥 B1'], ['b2', '💎 B2']];
const TABS_EN = [['all', '📚 全部'], ['0', '🌱 入门'], ['a1', '⭐ 中考'], ['a2', '⭐⭐ 高考'], ['b1', '🔥 四级'], ['b2', '💎 六级']];
const LN_DE = { '0': '零基础', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2' };
const LN_EN = { '0': '入门', a1: '中考', a2: '高考', b1: '四级', b2: '六级' };
const meta = computed(() => (langS.isEn ? META_EN : META_DE));
const tabs = computed(() => (langS.isEn ? TABS_EN : TABS_DE));
const lvName = (l) => (langS.isEn ? LN_EN : LN_DE)[l] || '';
const LB = { '0': 'lb-0', a1: 'lb-a1', a2: 'lb-a2', b1: 'lb-b1', b2: 'lb-b2' };

const cats = ref([]); const loading = ref(true);
const level = ref('all'); const cat = ref('all');
const q = ref(''); const recent = ref([]);
const flipped = ref({});
const known = ref(getKnown());
const onlyUnknown = ref(false);
const artColor = ref(localStorage.getItem('artColor') !== '0');

// ── 朗读设置：与旧站 spkCfg 同键同结构 ──
const spk = ref({ rate: 0.62, repeat: 2, zh: true, shuffle: false });
try { Object.assign(spk.value, JSON.parse(localStorage.getItem('spkCfg') || '{}')); } catch {}
watch(spk, (v) => { try { localStorage.setItem('spkCfg', JSON.stringify(v)); } catch {} }, { deep: true });

async function load() {
  loading.value = true;
  cats.value = await loadData(langS.file('categories'));
  known.value = { ...getKnown() };
  loading.value = false;
}
onMounted(() => {
  load();
  try { recent.value = JSON.parse(localStorage.getItem('recentSearch') || '[]'); } catch {}
});
watch(() => langS.lang, () => { level.value = 'all'; cat.value = 'all'; load(); });

const levelCats = computed(() => (level.value === 'all'
  ? cats.value : cats.value.filter((c) => c.level === level.value)));

function setLevel(l) {
  level.value = l; cat.value = 'all'; stopAuto();
  setLastStudy({ level: l, cat: 'all', name: '词句 · ' + (lvName(l) || '全部') });
}
function setCat(name) {
  cat.value = name; stopAuto();
  setLastStudy({ level: level.value, cat: name,
    name: name === 'all' ? ('词句 · ' + (lvName(level.value) || '全部')) : ('词句 · ' + name) });
}

// ── 搜索：德/中/谐音三栏都匹配，与旧站一致 ──
const searching = computed(() => q.value.trim().length > 0);
function rememberSearch() {
  const s = q.value.trim(); if (s.length < 2) return;
  const list = [s, ...recent.value.filter((x) => x !== s)].slice(0, 8);
  recent.value = list;
  try { localStorage.setItem('recentSearch', JSON.stringify(list)); } catch {}
}
const hits = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return [];
  const out = [];
  for (const c of cats.value) {
    for (const p of c.phrases) {
      if ((p.de + p.zh + (p.py || '')).toLowerCase().includes(s)) out.push(p);
      if (out.length >= 300) return out;      // 与旧站一样封顶，避免一次铺几千张卡
    }
  }
  return out;
});

// 分组视图：按分类分段，段首是 sec-title（旧站同构）
const groups = computed(() => levelCats.value
  .filter((c) => cat.value === 'all' || c.name === cat.value)
  .map((c) => ({ cat: c, list: c.phrases.filter((p) => !(onlyUnknown.value && known.value[p.de])) }))
  .filter((g) => g.list.length));
const shownCount = computed(() => (searching.value ? hits.value.length
  : groups.value.reduce((a, g) => a + g.list.length, 0)));

// ── 分批渲染 ──
// 「全部级别 + 全部分类」是 4000+ 条，一次性铺出来在手机上会卡住主线程好几秒。
// 旧站用 startChunkedRender(PH_CHUNK=100) + IntersectionObserver 哨兵分批追加，
// 这里照搬：先把分组压平成一维（表头也是一项），再按 100 条一批放出来。
const CHUNK = 100;
const shown = ref(CHUNK);
const flat = computed(() => {
  if (searching.value) return hits.value.map((p) => ({ p }));
  const out = [];
  for (const g of groups.value) {
    out.push({ head: g });
    for (const p of g.list) out.push({ p });
  }
  return out;
});
const visible = computed(() => flat.value.slice(0, shown.value));
const more = computed(() => shown.value < flat.value.length);
// 筛选条件一变就回到第一批，否则切级别后还留着上一批的高度
watch([() => level.value, () => cat.value, () => q.value, onlyUnknown], () => { shown.value = CHUNK; });

const sentinel = ref(null);
let io = null;
onMounted(() => {
  if (!('IntersectionObserver' in window)) { shown.value = 1e9; return; }
  io = new IntersectionObserver((es) => {
    if (es[0].isIntersecting && more.value) shown.value += CHUNK;
  }, { rootMargin: '700px' });
  nextTick(() => { if (sentinel.value) io.observe(sentinel.value); });
});
onBeforeUnmount(() => { io && io.disconnect(); stopAuto(); });

function toggleKnown(p) {
  if (known.value[p.de]) unmarkKnown(p.de);
  else { markKnown(p.de); studyTick(1, false); }
  known.value = { ...getKnown() };
  acct.syncSoon && acct.syncSoon();
}
function say(de) { speak(de, langS.isEn ? 'en-US' : 'de-DE', spk.value.rate); }

// ── 冠词上色：只给「冠词 + 名词」整体上色，避免误伤句首的 Das/Die ──
const ART_RE = /^(der|die|das)(\s+)([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]*(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]*)?)$/;
function artOf(de) {
  if (!artColor.value || langS.isEn) return null;
  const m = ART_RE.exec((de || '').trim());
  return m ? { art: m[1], rest: m[2] + m[3] } : null;
}
function toggleArt() {
  artColor.value = !artColor.value;
  try { localStorage.setItem('artColor', artColor.value ? '1' : '0'); } catch {}
}

// ── 循环朗读：依次念当前可见的句子，念完停；再点一次停止 ──
const playing = ref(false);
let seq = [], si = 0, gen = 0;
function stopAuto() {
  playing.value = false; gen++;
  try { speechSynthesis.cancel(); } catch {}
}
function toggleAuto() {
  if (playing.value) return stopAuto();
  seq = searching.value ? hits.value.slice() : groups.value.flatMap((g) => g.list);
  if (spk.value.shuffle) seq = seq.slice().sort(() => Math.random() - 0.5);
  if (!seq.length) return;
  si = 0; playing.value = true; gen++;
  step(gen);
}
function step(myGen) {
  if (myGen !== gen || !playing.value) return;
  const p = seq[si];
  if (!p) return stopAuto();
  // 先念德语 N 遍，可选再念一遍中文，然后进下一句
  const queue = [];
  for (let i = 0; i < (spk.value.repeat || 1); i++) queue.push([p.de, langS.isEn ? 'en-US' : 'de-DE']);
  if (spk.value.zh) queue.push([p.zh, 'zh-CN']);
  let k = 0;
  const runNext = () => {
    if (myGen !== gen || !playing.value) return;
    if (k >= queue.length) { si++; return step(myGen); }
    const [text, lang] = queue[k++];
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = spk.value.rate;
      u.onend = runNext; u.onerror = runNext;
      speechSynthesis.speak(u);
    } catch { runNext(); }
  };
  runNext();
}
</script>

<template>
  <div class="page">
    <div class="hero-label">{{ langS.isEn ? 'Everyday English' : 'Alltagsdeutsch' }}</div>
    <h1 class="page-title">日常对话 + 词汇大全</h1>
    <p class="page-sub">{{ cats.length }} 个主题 · {{ cats.reduce((a, c) => a + c.phrases.length, 0) }} 条词句 · 每句带朗读与谐音</p>

    <!-- 词性上色图例（仅德语） -->
    <div v-if="!langS.isEn" class="art-legend">
      <span>名词按词性上色：</span>
      <b class="art-der">der</b> <b class="art-die">die</b> <b class="art-das">das</b>
      <button type="button" class="art-toggle" :aria-pressed="String(artColor)" @click="toggleArt">🎨 上色</button>
    </div>

    <div class="search-wrap">
      <input v-model="q" type="search" placeholder="搜索德语、中文或谐音..." @change="rememberSearch">
      <span class="search-icon" aria-hidden="true">🔍</span>
    </div>
    <div v-if="recent.length && !q" class="recent-row">
      <button v-for="r in recent" :key="r" type="button" class="recent-chip" @click="q = r">{{ r }}</button>
    </div>

    <div class="level-tabs">
      <button v-for="[k, label] in tabs" :key="k" type="button"
        class="level-tab" :class="{ active: level === k }" @click="setLevel(k)">{{ label }}</button>
    </div>
    <div v-if="level !== 'all'" class="level-info" :style="{ borderLeftColor: meta[level].color }">
      <b :style="{ color: meta[level].color }">{{ meta[level].label }}</b>　{{ meta[level].desc }}
    </div>

    <div class="cat-tabs">
      <button type="button" class="cat-tab" :class="{ active: cat === 'all' }" @click="setCat('all')">全部</button>
      <button v-for="c in levelCats" :key="c.name" type="button"
        class="cat-tab" :class="{ active: cat === c.name }" @click="setCat(c.name)">
        {{ c.icon }} {{ c.name }}
        <span v-if="level === 'all'" class="level-badge" :class="LB[c.level]">{{ lvName(c.level) }}</span>
      </button>
    </div>

    <div class="play-row">
      <button type="button" class="fab-read" :class="{ speaking: playing }" @click="toggleAuto">
        {{ playing ? '⏹ 停止' : '▶ 循环朗读' }}
      </button>
      <span class="play-info">{{ playing ? `正在朗读第 ${si + 1} / ${seq.length} 句` : `将朗读 ${shownCount} 句` }}</span>
    </div>

    <div class="spk-panel">
      <label>语速 <input v-model.number="spk.rate" type="range" min="0.35" max="1.6" step="0.05"> <span>{{ spk.rate }}</span></label>
      <label>遍数 <select v-model.number="spk.repeat"><option :value="1">1</option><option :value="2">2</option><option :value="3">3</option></select></label>
      <label><input v-model="spk.zh" type="checkbox"> 读中文</label>
      <label><input v-model="spk.shuffle" type="checkbox"> 乱序</label>
    </div>
    <label class="only-unknown"><input v-model="onlyUnknown" type="checkbox"> 只看没学会的（藏起已打✓的词，专攻生词）</label>

    <p v-if="loading" class="page-sub">📖 词库加载中…</p>
    <div v-else class="results">{{ searching ? `找到 ${hits.length} 条` : `共 ${shownCount} 条` }}</div>

    <!-- 卡片流：搜索时平铺，否则按分类分段；两种都走同一条分批渲染的一维列表 -->
    <template v-for="(it, i) in visible" :key="i">
      <div v-if="it.head" class="sec-title">
        <span class="sec-title-icon">{{ it.head.cat.icon }}</span>
        <span class="sec-title-text">{{ it.head.cat.name }}</span>
        <span v-if="level === 'all'" class="level-badge" :class="LB[it.head.cat.level]">{{ lvName(it.head.cat.level) }}</span>
        <span class="sec-title-count">{{ it.head.list.length }}句</span>
      </div>
      <div v-else class="card" :class="{ flipped: flipped[it.p.de] }"
        @click="flipped[it.p.de] = !flipped[it.p.de]">
        <div class="card-de-row">
          <button class="speak-btn" type="button" :aria-label="'朗读 ' + it.p.de" @click.stop="say(it.p.de)">🔊</button>
          <div class="card-de" :lang="langS.isEn ? 'en' : 'de'">
            <template v-if="artOf(it.p.de)"><b :class="'art-' + artOf(it.p.de).art">{{ artOf(it.p.de).art }}</b>{{ artOf(it.p.de).rest }}</template>
            <template v-else>{{ it.p.de }}</template>
          </div>
          <button class="star-btn" type="button" :class="{ on: known[it.p.de] }"
            :title="known[it.p.de] ? '已学会（点击取消）' : '标记为已学会'"
            aria-label="标记已学会" @click.stop="toggleKnown(it.p)">✓</button>
        </div>
        <div class="card-zh">{{ it.p.zh }}</div>
        <div class="card-py"><span class="py-label">谐音</span> <span class="py-text">{{ it.p.py }}</span></div>
      </div>
    </template>
    <!-- 哨兵：进视口就再放一批（rootMargin 700px，滚到之前就备好了） -->
    <div ref="sentinel" style="height:1px"></div>
    <p v-if="more" class="page-sub">继续下滑加载更多…（已显示 {{ visible.length }} / {{ flat.length }}）</p>
    <p v-if="!loading && !flat.length" class="page-sub">这个筛选下没有词条，换个级别试试 🙂</p>
  </div>
</template>

<style scoped>
/* 词性图例 */
.art-legend{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;
  color:var(--text-dim);margin:0 0 12px;justify-content:center}
.art-legend b{font-weight:700}
.art-der{color:var(--art-der)}.art-die{color:var(--art-die)}.art-das{color:var(--art-das)}
.art-toggle{position:relative;min-height:44px;padding:6px 12px;border-radius:14px;
  border:1px solid var(--border);background:transparent;color:var(--text-dim);
  font-size:12px;font-family:inherit;cursor:pointer}
.art-toggle[aria-pressed=true]{border-color:var(--gold);color:var(--text)}

/* 搜索框 */
.search-wrap{position:relative;margin:0 0 10px}
.search-wrap input{width:100%;min-height:44px;padding:11px 16px 11px 42px;border-radius:22px;
  border:1px solid var(--border);background:var(--surface);color:var(--text);
  font-size:15px;font-family:inherit;outline:none}
.search-wrap input:focus{border-color:var(--gold-dim)}
.search-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:15px}
.recent-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
.recent-row::-webkit-scrollbar{display:none}
.recent-chip{position:relative;flex-shrink:0;min-height:44px;padding:6px 12px;border-radius:14px;
  border:1px solid var(--border);background:transparent;color:var(--text-dim);
  font-size:12px;font-family:inherit;cursor:pointer;white-space:nowrap}

/* 级别说明条 */
.level-info{border-left:3px solid var(--gold);background:var(--surface);padding:10px 14px;
  border-radius:0 8px 8px 0;margin:10px 0 14px;font-size:13px;line-height:1.6;color:var(--text-dim)}

/* 分类横滑标签 */
.cat-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 0 10px;scrollbar-width:none}
.cat-tabs::-webkit-scrollbar{display:none}
.cat-tab{position:relative;flex-shrink:0;min-height:44px;padding:8px 14px;border-radius:18px;
  border:1px solid var(--border);background:var(--surface);color:var(--text-dim);
  cursor:pointer;font-size:13px;font-family:inherit;white-space:nowrap}
.cat-tab.active{background:var(--gold);color:#14240a;border-color:var(--gold);font-weight:700}
.level-badge{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;
  font-size:12px;font-weight:600;background:var(--surface-2);color:var(--gold-text);
  border:1px solid var(--border)}
.lb-0{color:var(--lv0)}.lb-a1{color:var(--lva1)}.lb-a2{color:var(--lva2)}
.lb-b1{color:var(--lvb1)}.lb-b2{color:var(--lvb2)}

/* 循环朗读 */
.play-row{display:flex;align-items:center;gap:10px;margin:10px 0;flex-wrap:wrap}
.fab-read{position:relative;min-height:44px;border:none;border-radius:24px;background:var(--gold);
  color:#14240a;font-size:14px;font-weight:600;font-family:inherit;padding:11px 18px;cursor:pointer}
.fab-read.speaking{background:var(--red);color:#fff}
.play-info{font-size:12px;color:var(--text-dim)}

/* 朗读设置面板 */
.spk-panel{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:8px 14px;font-size:13px;color:var(--text-dim)}
.spk-panel label{display:inline-flex;align-items:center;gap:6px;min-height:44px;
  max-width:100%;min-width:0;flex-wrap:wrap}
/* 滑块给固定 110px 会在 200% 缩放（≈195px 视口）下把整行撑到 199px，
   全站跟着出现横向滚动。改成「最多 110，容器窄了就跟着缩」 */
.spk-panel input[type=range]{width:min(110px,100%);min-width:0;height:44px;
  background:transparent;accent-color:var(--gold)}
.spk-panel select{min-height:44px;min-width:44px;border-radius:8px;border:1px solid var(--border);
  background:var(--surface);color:var(--text);font-family:inherit;font-size:13px}
.spk-panel input[type=checkbox]{width:20px;height:20px;accent-color:var(--gold)}
.only-unknown{display:inline-flex;align-items:center;gap:6px;min-height:44px;
  font-size:13px;color:var(--text-dim);cursor:pointer;margin:4px 0}
.only-unknown input{width:20px;height:20px;accent-color:var(--gold)}
.results{font-size:12px;color:var(--gold-text);margin:8px 0}

/* 卡片：与旧站 makeCard 同构 —— 🔊 / 句子 / ✓，点一下翻面看谐音 */
.card{cursor:pointer;transition:background .2s,border-color .2s,transform .2s}
.card:hover{background:var(--gold-faint);border-color:var(--gold-dim);transform:translateY(-2px)}
.card.flipped{background:var(--gold-faint);border-color:var(--gold-dim)}
.card-de-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.card-de{flex:1;min-width:0;font-size:16px;color:var(--text);font-style:italic}
.card-zh{font-size:14px;color:var(--text-dim)}
.card-py{display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--gold-faint)}
.card.flipped .card-py{display:block}
.py-label{font-size:12px;color:var(--text-dim)}
.py-text{font-size:13px;color:var(--gold-text)}
.speak-btn,.star-btn{position:relative;flex-shrink:0;width:30px;height:30px;border:none;
  border-radius:50%;background:var(--gold-faint);color:var(--gold-text);font-size:15px;
  cursor:pointer;display:inline-flex;align-items:center;justify-content:center;
  line-height:1;padding:0;font-family:inherit}
.speak-btn::after,.star-btn::after{content:"";position:absolute;left:50%;top:50%;
  transform:translate(-50%,-50%);width:44px;height:44px}
.star-btn{margin-left:auto;background:transparent;color:var(--text-faint);border:1px solid var(--border)}
.star-btn.on{background:var(--gold);color:#14240a;border-color:transparent}
.speak-btn:active,.star-btn:active{transform:scale(.88)}
</style>
